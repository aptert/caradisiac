var es = require('elasticsearch');

var client = new es.Client( {  
    hosts: [
      'http://localhost:9200/'
    ]
  });


  module.exports = client