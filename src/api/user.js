// Peerio User object

var User;
(function(){
  'use strict';

  User = function(username, publicKey, isMe){
    this.username = username;
    this.publicKey = publicKey;
    this.isMe = !!isMe;

    if(this.isMe){
      this.contacts = {};
      this.keyPair = {};
    }

  };

})();