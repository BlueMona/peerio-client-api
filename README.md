# peerio-client-api

## distribution package

Distribution files are located in `/dist/` folder.

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
  
