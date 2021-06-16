"# Suppy-Chain-Management" 

• Implemented a transparent and accurate end-to-end tracking in the supply chain using the Blockchain Technology in local environment.

• Built the mining route involving proof of work, consensus route from scratch.

• Designed the smart contracts and its corresponding functionalities in Javascript


Routes Crested : 

Enter Transaction : 

URI: http://localhost:3001/transactions/broadcast

METHOD: 'POST'

BODY : 
{
        "sender" : "Manash Pratim Das",
        "recipient": "Nabanita Bania",
        "productID": "kj1b2sf2d133assd23",
        "productType": "Whisky",
        "quantity":4,
        "paymentMode": "Net Banking",
        "paymentID": "23j23jk4basdj4jk23",
        "deliveryType": "India Post",
        "orderDate": "17/03/2021"
}


Register Node : 

URI: http://localhost:3001/register-and-broadcast-node

METHOD: 'POST'

BODY:

{
    "newNodeURL" : "http://localhost:3003"
}


Mine Block :

URI: http://localhost:3002/mine

METHOD: 'GET'
