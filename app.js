
var express = require('express');
var client = require('./connection.js');
const { getBrands } = require('node-car-api');
const { getModels } = require('node-car-api');
var hostname = 'localhost';
var port = 9292;

var app = express();

async function Brands() {
    const brands = await getBrands();

    return brands;
}

async function Models(brand) {
    const models = await getModels(brand);

    return models;
}

function getModel(brand) {
    return new Promise((resolve, reject) => {
        Models(brand)
            .then(models => { return resolve(models) })
            .catch(err => { return reject(err) })
    })
}

function InitMapping() {
    var body = { car: { properties: { "volume": { "type": "text", "fielddata": true } } } }
    return client.indices.putMapping({ index: "cars", type: "car", body: body })
}


app.route("/populate") 
    .get(function (req, res) { 
        Brands()
            .then(brands => {
                const requests = brands.map(brand => getModel(brand))
                Promise.all(requests)
                    .then(results => {
                        var models = [].concat.apply([], results)
                        var bulk_body = [];
                        models.forEach(model => {
                            bulk_body.push({ index: { _index: 'cars', _type: 'car', _id: model.uuid } })
                            bulk_body.push(model)
                        });
                        console.log(bulk_body);
                        client.bulk({
                            body: bulk_body
                        }, (err, resp) => { 
                            if (err) res.send(err)
                            else {
                                client.indices.putMapping({
                                    index: "cars",
                                    type: "car",
                                    body: {
                                        "properties": {
                                            "volume": {
                                                "type": "text",
                                                "fielddata": true
                                            }
                                        }
                                    }
                                }).then((result) => {
                                    res.send(resp);
                                })
                                    .catch((err) => { console.log(err) })

                            }
                        })
                    })
                    .catch(err => console.log(err))
            })
    })


app.route("/suv")
    .get(function (req, res) {
        var query = {
            "sort": [
                {
                    "volume": { "order": "desc" }
                }
            ]
        }

        client.search({
            index : "cars",
            type : "car",
            body : query
        },(err,resp)=>{
            res.send(resp)
        });
    })

// Démarrer le serveur 
app.listen(port, hostname, function () {
    console.log("Listening on port " + port + "...");
});