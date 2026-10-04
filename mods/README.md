# Mods

Drop a component script into `mods/components/` to add a new component, or to replace a built-in or
content component with the same name (for example `mods/components/Spider.js`). Mods load last.

Scripts get engine pieces from `require("orbus")` (NetComponent, Monster, StatusEffects, Chance, ...),
the same way the scripts in `content/monsters/` do.
