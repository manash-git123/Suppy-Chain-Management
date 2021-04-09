// We want several instances of this API over a network inorder to make a decentralised system
const port = process.argv[2];

// Here we will create an Express Server API to interact with the blockchain 
const express = require('express');
const app = express();

// Create a unique ID for the current user
const uuid = require('uuid');
const userAddress = uuid.v1().split('-').join('');

// Additional libraries
const rp = require('request-promise');

// Import Blockchain we created
const Blockchain = require('./blockchain');

// Create an instance of our Blockchain that will be the cryptocurrency
const supplyChain = new Blockchain(); 

// Import Body Parser
const bodyParser = require('body-parser');

// To use body parser into the code 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//  This on hitting will return the entire blockchain
app.get('/blockchain', function(req, res){
    res.send(supplyChain);
});

// Endpoint we will hit to create a new transaction
app.post('/transactions', function(req, res){
    const newTransaction = req.body;
    const blockIndex = supplyChain.addTransactionToPendingTransactions(newTransaction);
    res.json({
        note : `Transaction to be added to block ${blockIndex}`
    });
});

// Endpoint we will hit to create a new transaction and broadcast it to the entire blockchain
app.post('/transactions/broadcast', function(req, res){
    const newTransaction = supplyChain.createNewTransaction(req.body.sender, req.body.recipient, req.body.productID, req.body.quantity, req.body.paymentMode, req.body.paymentID, req.body.productType, req.body.deliveryType, req.body.orderDate);
    supplyChain.addTransactionToPendingTransactions(newTransaction);
     
    const requirePromises = [];
    supplyChain.networkNodes.forEach(networkNodeURL => {
        const requestOption = {
            uri: networkNodeURL + '/transactions',
            method: 'POST',
            body: newTransaction,
            json: true
        };
        requirePromises.push(rp(requestOption)); 
    });
    Promise.all(requirePromises)    
    .then(data => {
        res.json({note : `Transaction created and broadcasted successfully`});
    }).catch(function (){
        console.log("Promise Rejected");
    });
});



// It will mine a new block for us
app.get('/mine', function(req, res){
    const lastBlock = supplyChain.getLastBlock();
    const previousBlockHash = lastBlock['hash'];
    const currentBlockData = {
        transactions : supplyChain.pendingTransactions,
        index : lastBlock['index'] + 1
    };
    const nonce = supplyChain.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = supplyChain.hashBlock(previousBlockHash, currentBlockData, nonce);
    const newBlock = supplyChain.createNewBlock(nonce, previousBlockHash, blockHash);

    const requirePromises = [];
    supplyChain.networkNodes.forEach(networkNodeURL => {
        const requestOption = {
            uri: networkNodeURL + '/receive-new-block',
            method: 'POST',
            body: { newBlock: newBlock },
            json: true
        };
        requirePromises.push(rp(requestOption)); 
    });
    Promise.all(requirePromises)    
    .then(data => {

        // Rewards for every mine will be provided here
        
        res.json({
            note: "The blocked has been successfully mined",
            block: newBlock
        });

    }).catch(function (){
        console.log("Promise Rejected");
    });
}); 

// On mining by a different address the data needs to be verified and stored into the copy of blockchain if the block is legitimate
app.post('/receive-new-block', function(req, res){
    const newBlock = req.body.newBlock;
    const lastBlock = supplyChain.getLastBlock();
    
    // 1st validation is done by checking whether the hash of the previous block matches to the previous hash according to the present copy of blockchain  
    const correctHash = lastBlock.hash === newBlock.previousBlockHash;

    // 2nd we validate the index of the block
    const correctIndex = lastBlock['index'] + 1 === newBlock['index'];

    // After validation we store the block and empty the pending transaction array
    if(correctHash && correctIndex){
        supplyChain.chain.push(newBlock);
        supplyChain.pendingTransactions = [];
        res.json({
            note: "New Block Validated and Stored successfully",
            newBlock: newBlock
        });
    }else{
        res.json({
            note: "Validation Failed and Block Rejected",
            newBlock: newBlock
        });
    }
});

// Registration of a new Node into the blockchain goes through several process

app.post('/register-and-broadcast-node', function(req, res){
    // Recieve the URL of new node
    const newNodeURL = req.body.newNodeURL;
    
    // Register only if the node doesn't already exist in the Blockchain
    if(supplyChain.networkNodes.indexOf(newNodeURL) == -1 && supplyChain.currentNodeURL !==  newNodeURL){
        supplyChain.networkNodes.push(newNodeURL);
    }

    // Handle the entire registration process asynchronously
    const regNodesPromises = [];
    supplyChain.networkNodes.forEach(networkNodeURL => {
        const requestOption = {
            uri : networkNodeURL + '/register-node',
            method : 'POST',
            body : {newNodeURL : newNodeURL},
            json : true
        };

        regNodesPromises.push(rp(requestOption));
    });
    console.log(regNodesPromises);
    // Execute all the promises
    
    Promise.all(regNodesPromises)
    .then(data => {
        const registerBulkOptions = {
            uri : newNodeURL + '/register-node-bulk',
            method : 'POST',
            body : {allNetworkNodes : [...supplyChain.networkNodes, supplyChain.currentNodeURL]},
            json : true
        }; 
        return rp(registerBulkOptions);
    }).then(data => {
        res.json({ note : "New node has been successfully registered into the Blockchain Network"});
    }).catch(function (){
        console.log("Promise Rejected");
    });
});  


app.post('/register-node', function(req, res){
    const newNodeURL = req.body.newNodeURL;
    // Check so that the nodeAddress doesn't already belongs into the registered network nodes array of the present node and
    // also so that it is not the present nodes address . 
    if(supplyChain.networkNodes.indexOf(newNodeURL) == -1 && supplyChain.currentNodeURL !== newNodeURL){
        supplyChain.networkNodes.push(newNodeURL);
    }
    res.json({note : 'New node registered'});
});

app.post('/register-node-bulk', function(req, res){
    const allNetworkNodes = req.body.allNetworkNodes;
    allNetworkNodes.forEach(networkNodeURl => {
        if(supplyChain.networkNodes.indexOf(networkNodeURl) == -1 && supplyChain.currentNodeURL !== networkNodeURl){
            supplyChain.networkNodes.push(networkNodeURl);
        }
    });
    res.json({note : 'All node registered in bulk'});
});


// Consensus
app.get('/consensus', function(req, res){
    const requestPromises = [];
    supplyChain.networkNodes.forEach(networkNodeURL => {
        const requestOption = {
            uri: networkNodeURL + '/blockchain',
            method: 'GET',
            json: true
        };
        
        requestPromises.push(rp(requestOption));
    });
    Promise.all(requestPromises)
    .then(blockchains => {
        const currentChainLength = supplyChain.chain.length;
        let maxChainLength = currentChainLength;
        let newLongestChain = null;
        let newPendingTransaction = null;

        blockchains.forEach(blockchain => { 
            if(blockchain.chain.length > maxChainLength){
                maxChainLength = blockchain.chain.length;
                newLongestChain = blockchain.chain; 
                newPendingTransaction = blockchain.pendingTransactions;
            }
        });

        if(!newLongestChain || (newLongestChain && !supplyChain.chainIsValid(newLongestChain))){
            console.log(supplyChain.chainIsValid(newLongestChain));
            res.json({
                note: 'Current Chain could not be added',
                chain: supplyChain.chain
            });
        }else if(newLongestChain && supplyChain.chainIsValid(newLongestChain)){
            supplyChain.chain = newLongestChain;
            supplyChain.pendingTransactions = newPendingTransaction;
            res.json({
                note: 'Chain has been replaced',
                chain: supplyChain.chain
            });
        }
    }).catch(function (){
        console.log("Promise Rejected");
    });
});


app.listen(port, function(){
    console.log(`Listening on port ${port}. Link- http://localhost:${port}`);
});