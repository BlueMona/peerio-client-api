

# (Legacy) Peerio client API library

This repository contains core code used by "legacy" Peerio mobile clients.

Components:

- Crypto library `src/crypto`
- Networking layer `src/network`
- Application logic layer `src/app_logic`
- Flux-ish event system `src/events`
- Shared objects/models `src/model`

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## TOC

- [usage](#usage)
  - [distribution package](#distribution-package)
  - [installing, configuring and initializing peerio-client-api in your project](#installing-configuring-and-initializing-peerio-client-api-in-your-project)
- [contributing](#contributing)
  - [style guide](#style-guide)
  - [testing](#testing)
  - [commit checklist](#commit-checklist)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## usage

### distribution package

Distribution files are located in `/dist/` folder. 

1. `peerio_client_api.js` - concatenated file containing: 
   - A few vendor scripts peerio-client-api relies on.
   - Most of the peerio-client-api scripts.
2. `config_template.js` - configuration file template.      
3. `socket_worker.js` - worker script for WebSocket handling socket operations. 
4. `socket.io.js` - `socket.io` client script. Socket worker will import it when started.   
5. `dict/*.txt` - passphrase generation dictionaries for different languages.

### installing, configuring and initializing peerio-client-api in your project
  
1. Install bower package `peerio-client-api` or clone this repository and execute `gulp build` to produce distribution files.
2. Copy distribution files anywhere in your project, retaining folder structure. Or keep them at your bower files location. 
3. Copy or rename `config_template.js` to `config.js` anywhere in your project. Change configuration to reflect your preferences. 
If you are updating peerio-client-api and already have `config.js`, look at the new `config_template.js` to find and manually apply changes.  
4. Include scripts retaining order
   ```html
   <script src="{yourpath}\config.js" \>
   <script src="{yourpath}\peerio-client-api.js" \>
   ```
   
5. `ondomready` and/or `ondeviceready` call `Peerio.InitAPI()`.

## contributing 

`npm install -g eslint babel-eslint eslint-react`

### style guide
Please follow this simple style guide:

1. Indentation: `4 spaces`
2. File names: `lower_cased_and_underscored`
3. Variables and function names: `camelCased`
4. Constructor functions and namespaces: `PascalCased`
5. Constants:  `UPPER_CASE_UNDERSCORED`
6. `'single quotes'`
7. `strictEquality === good`
8. Line termination: mandatory semicolon `;`
9. You are free to follow your taste with other style aspects, but don't change formatting of the code you are not working with.
10. Use promises, not callbacks.

### testing
```
gulp test
```

This starts:   

* gulp watcher, it builds source files into `dest` folder.  
* karma server watching `dest` folder changes.

### commit checklist

1. Tests are not failing.
2. New code is covered with tests.
3. Run `gulp build` before commit.
4. `README.md` is updated with information relevant tou your commit. 
5. Commit message: laconic, but descriptive. Reference `#github_issue_id` or `#multiple #issue #ids`.
