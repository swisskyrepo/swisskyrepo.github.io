# Blog

Requires Zola 0.23.6 or newer. CI builds with Zola 0.23.6 and the pinned
Linkita revision from its `main` branch.

```ps1
$ pacman -S zola
$ git submodule update --init --recursive
$ zola init myblog
$ zola serve --interface 192.168.1.XX
```

Blog content templating is disabled with `skip_content_templating` so SSTI
payload examples remain literal. Templates and injects still use Tera.

## References

* https://www.getzola.org/documentation/getting-started/directory-structure/
* https://www.getzola.org/themes/linkita/
* https://www.getzola.org/documentation/deployment/github-pages/
