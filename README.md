# peerio-client-api

This repository contains code shared between all Peerio clients.

Components:

- Crypto library `src/crypto`
- Networking layer `src/network`
- Application logic layer `src/app_logic`
- Flux-ish event system `src/events`
- Shared objects/models `src/model`

## build & distribution package

Distribution files are located in `/dist/` folder. Execute `gulp build` to produce distribution files.

1. `peerio_client_api.js` - concatenated file containing: 
   - A few vendor scripts peerio-client-api relies on.
   - Most of the peerio-client-api scripts.
    
   Include this file into your client with `<script>` tag.

2. `config_template.js` - configuration file.
   
   Rename/copy it to `config.js` anywhere in your project, change the configuration settings and also include it with `<script>` tag **before** the main file.
   
3. `socket_worker.js` - worker script for WebSocket handling operations. 

   This separate file will be passed to WebWorker constructor when API initializes. You don't have to do anything with it.

4. `socket.io.js` - `socket.io` client script.

   Will be imported by `socket_worker.js` when it starts.
  
5. `dict/*.txt` - passphrase generation dictionaries for different languages.

   `Peerio.PassphraseGenerator` loads dictionaries on demand.
  

## contributing 

### style guide
Please follow this simple style guide:

1. Indentation: `2 spaces`
2. File names: `lower_cased_and_underscored`
3. Variables and function names: `camelCased`
4. Constructor functions and namespaces: `PascalCased`
5. Constants:  `UPPER_CASE_UNDERSCORED`
6. Line termination: mandatory semicolon `;`
7. You are free to follow your taste with other style aspects, but don't change formatting of the code you are not working with.
8. Use promises, not callbacks.

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
