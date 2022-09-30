---
layout: post
title: Offensive Nim - Auto Obfuscate Strings with Nim's Term-Rewriting Macros
---

TLDR: Use `nim-strenc`, or read below to discover how to write your own Nim macro.

<!--more-->

Lately I discovered the repository [Yardanico/nim-strenc](https://github.com/Yardanico/nim-strenc), you can use it very easily in your Nim code by importing `strenc`.    
Let's try it on this simple example. First you need to install the package using this command: `nimble install strenc`

{% highlight py%}
import strenc
echo "demo string"
{% endhighlight %}

You can compile the code with `nim c -d=danger --passl=-flto --threads:on --opt=size --out=demo demo.nim` and the compiler will display some hints.

{% highlight py%}
Hint: used config file '/etc/nim/nim.cfg' [Conf]
Hint: used config file '/etc/nim/config.nims' [Conf]
....................................................................
/home/audit/Bureau/MiscNimMacroObfu/demo.nim(2, 6) Hint: encrypt("demo string") --> ' {.noRewrite.}:
  m611v5u8zi(estring("\x16\x10\x19\x18V\n\f\t\x13\x13\e"), 1823285395)' [Pattern]
CC: demo.nim
Hint:  [Link]
Hint: gc: refc; threads: on; opt: size; options: -d:danger
{% endhighlight %}

In the hints we see the string "`demo string`" is automagically replaced by `m611v5u8zi(estring("\x16\x10\x19\x18V\n\f\t\x13\x13\e"), 1823285395)`, reducing our static analysis detections.

Before going deeper in the code of `nim-strenc`, we need to understand a bit of macro term-rewriting.

> Term rewriting macros are macros or templates that have not only a name but also a pattern that is searched for after the semantic checking phase of the compiler: This means they provide an easy way to enhance the compilation pipeline with user defined optimizations:

Term rewriting macro are applied recursively. This means that if the result of a term rewriting macro is eligible for another rewriting, the compiler will try to perform it, and so on, until no more optimizations are applicable. 

Now let's try some basic macros. For example the following macro can be used to generate a debug statement if the variable debug is set to `true`

{% highlight py%}
import macros
const debug = true

template log(msg: string) =
  if debug: stdout.writeLine(msg)

var x = 4
log("x has the value: " & $x)
{% endhighlight %}

This is nice but we can go deeper by interacting directly with variables and their types. If you are unsure about how a type is represented and handled in Nim, you can use `dumpTree` to generate the Abstract Syntax Trees (AST) at compile time. This will be very useful to debug our macros.

{% highlight py%}
import macros
dumpTree:
  const cfgversion: string = "1.0"
  const cfglicenseOwner = "John Doe"
{% endhighlight %}

The output will look like this:

StmtList
  ConstSection
    ConstDef
      Ident "cfgversion"
      Ident "string"
      StrLit "1.0"
  ConstSection
    ConstDef
      Ident "cfglicenseOwner"
      Empty
      StrLit "John Doe"

We now have everything to understand the code of `nim-strenc`. The code starts by defining a new type `estring` ([#L7](https://github.com/Yardanico/nim-strenc/blob/master/src/strenc.nim#L7)) otherwise our macro will be called recursively on our newly created string.

{% highlight py%}
type
  estring = distinct string
{% endhighlight %}

Then it defines a proc to encrypt an estring using a key, note that the key is an integer. The name of this proc will be the same in every generated binary

{% highlight py%}
# Use a "strange" name
# We need {.noinline.} here because otherwise C compiler
# aggresively inlines this procedure for EACH string which results
# in more assembly instructions
proc m611v5u8zi(s: estring, key: int): string {.noinline.} =
  var k = key
  result = string(s)
  for i in 0 ..< result.len:
    for f in [0, 8, 16, 24]:
      result[i] = chr(uint8(result[i]) xor uint8((k shr f) and 0xFF))
    k = k +% 1
{% endhighlight %}

The encryption is doing a basic XOR where the key is modified a bit after every character. in order to avoid having always the same key in the produced binary, nim-strenc uses a simple but effective trick, by generating a hash based on the compile time and date.

{% highlight py%}
var encodedCounter {.compileTime.} = hash(CompileTime & CompileDate) and 0x7FFFFFFF
{% endhighlight %}


Finally there is the macro to match every String Literal from the source code, encrypt it with the proc `m611v5u8zi` then it will rewrite the matched string to `m611v5u8zi(estring("\xFF...\xXX"), counter)`. Since the encryption is a XOR it can effectively use the same proc to encode and decode the string.
It uses `getAst` to generate the correct AST for our replaced string, and then the counter is modified.
{% highlight py%}
macro encrypt*{s}(s: string{lit}): untyped =
  var encodedStr = m611v5u8zi(estring($s), encodedCounter)

  template genStuff(str, counter: untyped): untyped = 
    {.noRewrite.}:
      m611v5u8zi(estring(`str`), `counter`)
  
  result = getAst(genStuff(encodedStr, encodedCounter))
  encodedCounter = (encodedCounter *% 16777619) and 0x7FFFFFFF
{% endhighlight %}


There are some limitations to this library
* the name of the encrypting/decrypting proc is always the same: `m611v5u8zi`, and it is a HUGE red flag..
* weak encryption using XOR operation, it might be interesting to implement a stronger algorithm, but the key is "random" for each build.
* it is just obfuscation and patterns for decryption are easily discoverable by any reverser :D

## References

* [Yardanico/nim-strenc - A tiny library to automatically encrypt string literals in Nim code](https://github.com/Yardanico/nim-strenc)
* [Compile-time string obfuscation - Nim Forum](https://forum.nim-lang.org/t/1305)
* [Rewrite all string literals? - Nim Forum](https://web.archive.org/web/20141222071406/https://forum.nim-lang.org/t/338)
* [Nim Documentation](https://docs.w3cub.com/nim/)
* [Nim Documentation: term-rewriting-macros](https://nim-lang.org/docs/manual_experimental.html#term-rewriting-macros)
* [Demystification of Macros in Nim](https://dev.to/beef331/demystification-of-macros-in-nim-13n8)
* [Macros in Nim - Tutorial](https://macros-in-nim-tutorial.readthedocs.io/en/latest/README.html)
