// Peerio User object

var Peerio = this.Peerio || {};
Peerio.Model = Peerio.Model || {};

(function(){
  'use strict';

  Peerio.Model.User = function(username, publicKey, isMe){
    this.username = username;
    this.publicKey = publicKey;
    this.isMe = !!isMe;

    if(this.isMe){
      this.contacts = {};
      this.keyPair = {};
    }

  };

})();