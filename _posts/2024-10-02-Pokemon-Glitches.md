---
layout: post
title: Anatomy of Pokemon glitches
image: /images/PokemonGlitches/pikachu-yellow.png
---

Digging into the anatomy of Pokemon Yellow glitches, or how to impress your school friends during break time. 

![](/images/PokemonGlitches/pikachu-yellow.png)

<!--more-->

## Why

A few weeks ago I cleaned an old GameBoy Color and I bought cheap cartridges on AliExpress. They worked fine until my GameBoy battery died when I was saving the game. After rebooting the device, I discovered the save was corrupt and I lost 20+ hours...

Then I opened my cartridges and discovered the internal battery was missing in this cheap reproduction. This means the game is using a [batteryless](https://github.com/acocalypso/batteryless-patches/tree/main/patches/GBC) save patch.

![](/images/PokemonGlitches/battery-aliexpress.png)

> A batteryless patch patches the ROM's save routine to dump the SRAM save to the ROM's flash chip, inside part of the ROM itself. It will also load back into SRAM when booted up. This means the game will temporarily freeze the system while it saves your game. But in the end, it saves you from ever needing to replace a battery in your cartridge, and you get peace of mind that your save won't ever just vanish someday from a dying battery. 

Here are a few key pointers about the battery in the GameBoy cartridge

- The batteries inside a Game Boy Color cart are to save the game onto a chip and hold the memory while the console is powered off.
- Your Game Boy Color cartridge battery life is approximately 15-20 years depending on the quality of the battery. 

However if something happens during the temporary freeze, then your data is gone. Since I was bound to start from zero, I wondered if I could use some glitches to speed up a bit my adventure.

In this blog post I will dive into the inner workings of these glitches, and you will see that even as a 7 years old you were able to do some interesting memory manipulation and logic bug exploitation!


## Setup

Here are the requirements to follow along the blog post and replicate the glitches.

* The source code of Pokemon Yellow is available on GitHub, thanks to the pret team who reverse engineered 100% of the ROM: [pret/pokeyellow](https://github.com/pret/pokeyellow)
* ROM file of Pokemon Yellow, any version (US/Europe/Japanese) will work, this blog post was done with `d9290db87b1f0a23b89f99ee4469e34b`
* Emulator with debugger: [SameBoy 0.16.2](https://sameboy.github.io/posts/release-0.16.2)

Sameboy support symbol files, you can build the ROM and then put breakpoints on specific functions using their name. Here is the symbol file for the original Pokemon Yellow rom : [pokeyellow.sym](https://raw.githubusercontent.com/pret/pokeyellow/symbols/pokeyellow.sym)


{% highlight powershell%}
# breakpoint
> b BattleTransition
Breakpoint 1 set at BattleTransition ($1c:$49d7)
Breakpoint 1: PC = BattleTransition ($49d7)
BattleTransition:
  ->49d7 <+000>: LD a, $01
    49d9 <+002>: LDH [hAutoBGTransferEnabled & $FF], a ; =$ba
    49db <+004>: CALL Delay3 ; =$3ddb
    49de <+007>: XOR a
    49df <+008>: LDH [hWY & $FF], a ; =$b0

# display the content of the memory for the address
ex wViridianForestCurScript
ex $cd2d
{% endhighlight %}

The following commands are a huge help when we want to debug our actions, pause the game or display the content of the memory at a specific address.

| Command     | Description   |
|-------------|---------------|
| registers   | Print values of processor registers and other important registers |
| backtrace   | Display the current call stack |
| print       | Evaluate and print an expression |
| examine     | Examine values at address |
| disassemble | Disassemble instructions at address |
| breakpoint  | Add a new breakpoint at the specified address/expression or range |
| watch       | Add a new watchpoint at the specified address/expression or range |
| list        | List all set breakpoints and watchpoints |
| reset       | Reset the program execution |
| continue    | Continue running until next stop |
| interrupt   | Interrupt the program execution |


## Pokemon Yellow

In the game you start with one Pokemon, a `PIKACHU` at level 2, given by Professor Oak. You also get some $$ from your mother, you should keep it safe because we will need 550$ to buy an `Escape Rope` for one of the glitches below.


## Long Range Trainer Glitch

The first glitch starts in the Viridian Forest, in order to reproduce it you have several requirements to met:

- Buy the `Escape Rope` (550 Poke$) at `Pewter City` mart.
- Do not battle the long-range trainer in the Viridian Forest.

But what is a long-range trainer ? In Pokemon there are two types of trainer, the one that engage a battle when you talk to them, or walk nearby, and the one that will walk toward you. The latter have an exclamation mark displayed on the screen when they see you.

![](/images/PokemonGlitches/long-range-trainer-glitch.png)

Once they see you it will change 3 values in memory, to let the game know that a battle is started in this map.

* `ViridianForestCurScript = 1`
* `Engaged by Trainer = 1` ($CD60)
* `NPC is moving = 1` ($D730)

![](/images/PokemonGlitches/long-range-trainer-glitch-2.png)


But if you are fast enough, you can trigger an escape by using an item or an ability from the Start menu:

* Escape Rope (item)
* Fly (ability)
* Teleport (ability)

![](/images/PokemonGlitches/trainer-glitch-example.gif)


Every time you move the game calls the `OverworldLoopLessDelay` which will check several actions in a specific actions:

* `checkIfStartIsPressed`
* `displayDialogue`
* `checkForOpponent`

As you can see, the game verify the `start` button before engaging the battle, allowing you to execute many actions from the `menu.`

![](/images/PokemonGlitches/long-range-trainer-glitch-start.png)

:warning: When you use the `Escape Rope`, you will get teleported to the last Pokemon Center you visited. But you will be locked out of any interactions since the `NPC is moving` flag has been activated. Furthermore the start button will not work anymore because the game thinks you are in a battle: `Engaged by Trainer = 1` ($CD60)


## Dealing With the Side Effects

There is a way to clear the `NPC is moving` flag in Pewter City, a kid will walk you to the Gym when you try to go the East of the city. The value of the first bit at the address `$D730` (`NPC is moving`) will be set back to `0` after the animation.

![](/images/PokemonGlitches/gadget-unset-bit-0.png)
![](/images/PokemonGlitches/npc-pewter-city.gif)


## Diving Into the Shared Memory

Now we want to modify another value in memory located at `$CD2D` which correspond to the SPECIAL stat of the last Pokemon you encountered.

At this point in the game you can either go in the grass to find a wild pokemon, but we won't know its SPECIAL stat (unless you print the content of the address in your debugger `ex $CD2D`). Doing the glitch that way will be tedious, and will force us to restart the device every time the value is not the one we want... Or we can initiate a battle against a trainer, they have a fixed pokemon, meaning they always have the same stats.

Let's do it with the first trainer in the GYM, he has a `DIGGLET` with a special stat of 14 (`0x0e`). This value will have a direct impact on the next pokemon we will encounter (spoiler alert: it will be a `GENGAR`).

![](/images/PokemonGlitches/get-the-pokemon.png)

For Pokemon Red and Blue, there is a map of trainers and the next pokemon you will get. Small warning, the map is huge, [map by ryumaster](https://puu.sh/257S). You will quickly realize that the pokemons are not ordered using the Pokedex ID, for example: RYDHON is the first one, so if you want a specific pokemon you will need the following list:

* [List of Pokémon by index number in Generation I - Bulbagarden](https://bulbapedia.bulbagarden.net/wiki/List_of_Pokémon_by_index_number_(Generation_I))
* [rbydigit.txt - ocf.berkeley.edu](http://www.ocf.berkeley.edu/~jdonald/pokemon/mewglitch_files/rbydigit.txt)

But why is the SPECIAL stat impacting the ID of the next Pokemon ? It lies within the `UNION` and `NEXTU` keywords used in the `ram/wram.asm` file to define how the memory is structured.

* **UNION** is a directive that allows you to overlay multiple structures or data definitions in the same memory space.
* **NEXTU** is used to move to the next structure or field within the same union space

In short we have 3 structures that are using the same space in memory. This space has a size of 39 bytes.

![](/images/PokemonGlitches/memory-layout.gif)

The lower bytes of `wEnemyMonUnmodifiedSpecial` (`$CD2C $CD2D`) is located at the 31st bytes from the start of the structure, and it's also the case for `wEngagedTrainerClass`. It means they share the same address and content.

`wEngagedTrainerClass` correspond to the type of Trainer that is battling you, for example: "Youngster", "Bug Catcher", "Athlete", "Fisher", etc. And the `wEngagedTrainerSet` is the number of the trainer. 

{% highlight powershell%}
wEngagedTrainerClass = 201 (0xC9)
wEngagedTrainerSet = 6
# Youngster #6
{% endhighlight %}

But this is also used for wild Pokemon, the first variable is used to define the **ID**, and the second is the **LEVEL**.

For example, the following data is a GENGAR level 35.

{% highlight powershell%}
wEngagedTrainerClass = 14 (0xe)
wEngagedTrainerSet = 35
# Gengar LVL35
{% endhighlight %}

If you want to calculate manually the spaces displayed on the GIF, here are a remainder of the units:

* `db` (Define Byte): 1 byte (8bits)
* `dw` (Define Word): 2 bytes (16bits)
* `ds` (Define Space): X bytes

`wMonEnemyAttackMod` is another good thing we can see in these memory structures as it is mapped in the same area as the `wEngagedTrainerSet`. If we find a way to alter this data, we can arbitrarily set the level of the next pokemon we get.

Fortunately for us, there is another gadget we can use, it's the stat modifier. In Pokemon, every creature start with modifier set to 7 for the attack, speed, accuracy and other field.

When some abilities are used, these modifiers will get their value either increased or decreased; with a respective cap of 13 and 1.

In short we can alter the level from a range of 1 to 13. It can be done using the `Growl` ability, which decrease the attack modifier of the enemy by one stage.

* Range from 7 to 1 for down modifier (ATK ⬇️, DEF ⬇️, SPEED ⬇️)
* Range from 7 to 13 for up modifier (ATK ⬆️, DEF ⬆️, SPEED ⬆️)


Here is a quick example of downgrading the ATK modifier to 1 using the `Growl` ability several times .

![](/images/PokemonGlitches/set-atk-mod-growl.gif)


Now the memory should look like this, after battling a wild pokemon anywhere between Pewter Gym and the Viridian Forest. 

{% highlight powershell%}
wEngagedTrainerClass = 14 (0xe)
wEngagedTrainerSet = 1
# Gengar LVL1
{% endhighlight %}


Quick note: The level can't go below 1 with this technique.

![](/images/PokemonGlitches/gadget-set-level.png)


## Start Battle & Weird Textbox

Now it's time to trigger this battle with our GENGAR since we have tailored the memory to be the Pokemon #14 at the level 1. Going into the grass and getting attacked by wild Pokemon is not the correct way as it will update the fields `EnemyMonUnmodifiedSpecial` and `MonEnemyAttackMod` in the memory. 

Actually it is way easier than that, when we escaped the battle using the « `Escape Rope` », we put the meta-map script ID into an inconsistent state. `Meta-map scripts` are also called `GameProgressFlags`, its a list of events used to execute code on the current map. For example, on the first map you can't walk into the grass until you advance further into the story, it is disabled later by changing the ID of the meta-map script.

By default the map of the Viridian Forest searches for trainers: `CheckFightingMapTrainers` (0), but we left it with `DisplayEnemyTrainerTextAndStartBattle` (1) when the « `!` » mark appeared before we "escape".

![](/images/PokemonGlitches/metaname-script-id.png)

By going back to the map, the meta-map script will still be `DisplayEnemyTrainerTextAndStartBattle`, and it will launch a new battle with the parameter we carefully modified in the memory.

![](/images/PokemonGlitches/gengar-lvl1-encounter.gif)

The textbox you get before the battle is the same ID as the last text box in memory, stored at the address `$CF13`.

Depending on which choice you made to generate the next pokemon, it will have one of these values.

* **ID: 09**: Talk to sign at the PokeCenter
* **ID: 02**: GYM Trainer talk
* **ID: 05**: NPC from Pewter City

![](/images/PokemonGlitches/textbox-list-map.png)

Here is another example, with the textbox: "Hi, do you have a PIKACHU"; corresponding to the ID `5` which means I only talked to the NPC from Pewter City and I didn't trigger the battle with the Trainer in the Gym.

![](/images/PokemonGlitches/textbox-pikachu.gif)

Capturing the Pokemon is left as an exercise for the reader. Even if it is a level 1, you will have to weaken him a lot, and I hope you have a lot of Pokeballs in your bag :P


## Experience Underflow 

Now we are done with memory manipulations, we have captured our GENGAR. Let's talk a bit about **Experience Algorithms**.

In Pokemon Red, Blue and Yellow, there are 6 experience algorithms but only 4 are really used in the code: `Medium Fast`, `Medium Slow`, `Fast` and `Slow`.

![](/images/PokemonGlitches/experience-algorithms.png)

Here is a list of Pokemons belonging to the `Medium Slow` group: BULBASAUR	, IVYSAUR, VENUSAUR, CHARMANDER, CHARMELEON, CHARIZARD, SQUIRTLE, WARTORTLE, BLASTOISE, PIDGEY, PIDGEOTTO, PIDGEOT, NIDORAN♀, NIDORINA, NIDOKING, NIDORAN♂, NIDORINO, NIDOQUEEN, ODDISH, GLOOM, VILEPLUME, POLIWAG, POLIWHIRL, POLIWRATH, ABRA	, KADABRA	, ALAKAZAM, MACHOP, MACHOKE, MACHAMP, BELLSPROUT, WEEPINBELL, VICTREEBEL, GEODUDE, GRAVLER, GOLEM, GASTLY, HAUNTER, GENGAR, MEW.

Do you see the problem with the Polynomial Function used for this group ? 

Yes, the value is negative for the levels 0 and 1. This is an absolute horror since it will be stored inside an `unsigned integer`. This type of data doesn't care about the sign, so `-54 XP` will become `16 777 162 XP`.

Despite the experience being for an extremely high level, you only need `1 059 860 XP` to get to level 100 for Pokemon in the `Medium Slow` group, and you can't go higher than 100.

![](/images/PokemonGlitches/math-experience-underflow.png)
![](/images/PokemonGlitches/python-experience-plot.png)

In short, if your level 1 Pokemon gains less than 54 XP, its current level will be computed from its previous XP. Do you recall how much it was ? Our pokemon had over 16 777 162 XP, getting level 100 in one battle !

![](/images/PokemonGlitches/gengar-level-100.gif)
![](/images/PokemonGlitches/gengar-lvl100.mp4)

**Pro tip**: Don't fight with your level 1 Pokemon, it is mostly likely not strong enough (unless its a METAPOD, they don't do damage).


## BONUS 1 - MEW

These glitches can be used later in the game to get the event exclusive `MEW`. It's basically using the Long Range Trainer glitch to escape the fight on the **Route 24**, then you engage in a battle with the Kid **Route 25** to have the Slowpoke stats in memory.

![](/images/PokemonGlitches/mew-glitch.png)


## BONUS 2 - Prof Oak

Earlier in this blog, we discovered that Trainer and Pokemon are the same thing.

* `Special stat < 200` triggers a Pokemon battle
* `Special stat >= 200` triggers a Trainer battle

However you won't find many Pokemon with a special stat over 200. But there is a way to remediate to this problem. The Pokemon `DITTO` have the `Transform` ability which will copy itself into your Pokemon, it will also copy the stats. 

Did you know that Prof Oak is not available in the game story, but he is coded and can be battled using a combination of the previous glitches. His index number is **226**, which is also the default value of MEWTWO SPECIAL stat.

This glitch requires 2 long range trainer because you won’t have the NPC from Pewter City to reset the « NPC is moving » value. Also you need a Pokemon with Growl to set one of the 3 teams attributed to him.

Here are the steps to battle him:

* Fly to **Lavender City**, go to Route 8, trigger the Long Range Trainer
* Fly to **Cerualean City**, go to Route 24, trigger the second Long Range Trainer, but you have to defeat him, to reset the « `NPC is moving` » value
* Fly to **Cinnabar Island**, and go to the Pokemon Mansion and find a `DITTO` (you have to go to a specific room)
* Wait for `DITTO` to copy your Pokemon with SPECIAL at 226
* Then switch to a Pokemon knowing `Growl`, use it 4 times (BLASTOISE), 5 times (VENUSAUR), 6 times (CHARIZARD)
* Then run away from the battle, use an `Escape Rope`, then fly back **Lavender City**, go to Route 8 to trigger the battle with `Prof Oak`.

![](/images/PokemonGlitches/prof-oak-stat.png)

![](/images/PokemonGlitches/prof-oak-encounter.gif)


I hope you liked these glitches, here are some saves to have every requirements met in order to reproduce them. Some saves are from a finished run where the long trainers have been re-enabled, use them to get Mew or fight Prof Oak.

* [Pokemon - Yellow Version (UE) [C][!] - LongRangeTrainerForest.sav](/files/PokemonSaves/Pokemon%20-%20Yellow%20Version%20(UE)%20[C][!]%20-%20LongRangeTrainerForest.sav)
* [Pokemon - Yellow Version (UE) [C][!] - XPGlitchGengar.sav](/files/PokemonSaves/Pokemon%20-%20Yellow%20Version%20(UE)%20[C][!]%20-%20XPGlitchGengar.sav)
* [Pokemon - Yellow Version (UE) [C][!] - XPGlitchNidoking.sav](/files/PokemonSaves/Pokemon%20-%20Yellow%20Version%20(UE)%20[C][!]%20-%20XPGlitchNidoking.sav)
* [Pokemon - Yellow Version (UE) [C][!] - AfterDigglet_EncounteringGengar.sav](/files/PokemonSaves/Pokemon%20-%20Yellow%20Version%20(UE)%20[C][!]%20-%20AfterDigglet_EncounteringGengar.sav)
* [Pokemon - Yellow Version (UE) [C][!] - FinishedGame_LongRangeTrainersPatched.sav](/files/PokemonSaves/Pokemon%20-%20Yellow%20Version%20(UE)%20[C][!]%20-%20FinishedGame_LongRangeTrainersPatched.sav)
* [Pokemon - Yellow Version (UE) [C][!] - ProfOakReady.sav](/files/PokemonSaves/Pokemon%20-%20Yellow%20Version%20(UE)%20[C][!]%20-%20ProfOakReady.sav)
* [Pokemon - Yellow Version (UE) [C][!] - MewGlitch_TrainerEnabled.sav](/files/PokemonSaves/Pokemon%20-%20Yellow%20Version%20(UE)%20[C][!]%20-%20MewGlitch_TrainerEnabled.sav)
* [Pokemon - Yellow Version (UE) [C][!] - Gengar LVL100 + 50 Rare Candy.sav](/files/PokemonSaves/Pokemon%20-%20Yellow%20Version%20(UE)%20[C][!]%20-%20Gengar%20LVL100%20+%2050%20Rare%20Candy.sav)


## References

* [CPU registers and flags - gbdev.io](https://gbdev.io/pandocs/CPU_Registers_and_Flags.html)
* [R/B/Y Stat Modification - The Cave of Dragonflies - March 29 2018](https://www.dragonflycave.com/mechanics/gen-i-stat-modification)
* [List of glitches in Generation I - Bulbagarden](https://bulbapedia.bulbagarden.net/wiki/List_of_glitches_in_Generation_I)
* [Yellow Glitches - Level 100 Before Brock - cerealz - March 10 2014](https://imgur.com/gallery/66pQj)
* [Level 100 Nidoking Glitch Pokemon Yellow - Pokemon Glitches and More - February 14 2014](https://youtu.be/2h3Fd-PNYWw)
* [How to capture a wild Gengar in Pokemon Yellow - hXcHector - 28 july 2018](https://www.youtube.com/watch?v=XqeI8Yohzbc)
* [The Most EXPLOITABLE GLITCH in Pokémon - Trainer-Fly (Mew Glitch) - Azure Flute -  8 dec 2023](https://www.youtube.com/watch?v=AjOeYO21kcQ)
* [Battle Professor Oak - Gamefaqs - zerokid - 03/21/2023](https://gamefaqs.gamespot.com/gameboy/367023-pokemon-red-version/faqs/64175/battle-professor-oak)
* [How to Catch MEW in Pokemon Yellow without Cheating! (Works on All Versions) - Nvoyhinz - 15 nov. 2021](https://www.youtube.com/watch?v=gW6NywxZVps)
* [Exploring the Mew Glitch - stacksmashing - 3 may 2020](https://youtu.be/U8fWTDUdWGA)
* [Pokémon Yellow - glitch items: the detailed analysis - TheZZAZZGlitch - 17 apr. 2023 ](https://youtu.be/vXmESw1Zoxo)