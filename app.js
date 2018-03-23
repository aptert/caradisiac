
var express = require('express');
var client = require('./connection.js');
const { getBrands } = require('node-car-api');
const { getModels } = require('node-car-api');
const pSettle = require('p-settle');
var hostname = 'localhost';
var port = 9292;

var app = express();

async function AllBrands() {
    const brands = await getBrands();

    return brands;
}

async function AllModels(brand) {
    const models = await getModels(brand);

    return models;
}

function getModel(brand) {
    return new Promise((resolve, reject) => {
        AllModels(brand)
            .then(models => { resolve(models) })
            .catch(err => { reject(err) })
    })
}

app.route("/populate") 
    .get(function (req, res) { 
        var brands =["DACIA", "PEUGEOT"]
        const requests = brands.map(brand => getModel(brand))
                console.log("mapping ok")
                Promise.all(requests)
                    .then((results) => {
                        console.log("Promise lancée")
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