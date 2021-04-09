// Author : Manash Pratim Das, Yash Srivastava, Nabanita Bania and Asis Kumar Roy
// Copyright@2021

// import sha256 npm library Future I'll implement myself
const sha256 = require('sha256');

// Library to create transaction ID
const uuid = require('uuid');

// Get the current node's URL 
const currentNodeURL = process.argv[3];

// Javascript Constructor function to create our main Blockchain data structure
// Preference is given to Constructor function over class in this particular project moreover classes in JS are implemented over constructor functions. 
function Blockchain(){

    // All the chains created within a blockchain network will be stored into the following chain[] array
    this.chain = [];

    // All the transactions within a blockchain network will be stored into the following pendingTransactions[] array
    this.pendingTransactions = [];

    // All the information related to nodes
    this.currentNodeURL = currentNodeURL;
    this.networkNodes = []; 

    // Genesis Block : 1st block of a blockchain
    this.createNewBlock(1, '0', '0');
}

// A prototype function added to the constructor Blockchain for creation of a new Block takes three parameters nonce, previousBlockHash and hash
// This is how every block in our Blockchain will look like
Blockchain.prototype.createNewBlock = function(nonce, previousBlockHash, hash){
    const newBlock = {
        // Index of the block
        index: this.chain.length + 1,
        
        // When the block was created
        timestamp: Date.now(),

        // All the new transactions before the creation of block should be stored
        transactions: this.pendingTransactions,

        // Nonce is the proof of work to ensure that the block has been created in a legitimate method
        nonce: nonce,

        // All the transaction details(data) will be hashed into a single string and stored 
        hash: hash,

        // Hashed data from the previous block 
        previousBlockHash: previousBlockHash
    };

    // After creation of a new block we have placed all the pendingTransactions into the block so now we need to clear the array
    this.pendingTransactions = [];

    // Push the new block into the blockchain
    this.chain.push(newBlock);

    return newBlock;
}

// Function to return the last block of the Blockchain
Blockchain.prototype.getLastBlock = function(){
    return this.chain[this.chain.length - 1];
}

// Function to insert a new transaction into the pendingTransaction[] array waiting to get verified whenever a new block is mined
Blockchain.prototype.createNewTransaction = function(sender, recipient, productID, quantity, paymentMode, paymentID, productType, deliveryType, orderDate){
    const newTransaction = {
        sender: sender,
        recipient: recipient,
        productID: productID,
        productType: productType,
        quantity:quantity,
        paymentMode: paymentMode,
        paymentID: paymentID,
        deliveryType: deliveryType,
        orderDate: orderDate,
        transactionID: uuid.v1().split('-').join('') 
    };

    return newTransaction
}

// Function to insert the transaction recived into the current node
Blockchain.prototype.addTransactionToPendingTransactions = function(transaction){
    // Push the newTransaction object into the main array
    this.pendingTransactions.push(transaction);

    // Return the index of the block to which it will be added to
    return this.getLastBlock()['index'] + 1; 
}

// Prototype function to create hashes
Blockchain.prototype.hashBlock = function(previousBlockHash, currentBlockData, nonce){

    //convert to a single string 
    const data = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);

    // hash the entire string 
    const hash = sha256(data);
    return hash;
}

// Proof of Work
Blockchain.prototype.proofOfWork = function(previousBlockHash, currentBlockData){
    
    let nonce = 0;
    let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    
    // Iterate the input to generate hash starting with 0000
    while(hash.substring(0, 4) !== '0000'){
        
        // Increment the value of nonce to keep on randomly changing the hash
        nonce++;
        hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
        // console.log(hash);
    }

    return nonce;
}


Blockchain.prototype.chainIsValid = function(blockchain){
    let validChain = true;
    for(var i=1;i<blockchain.length;i++){
        const currentBlock = blockchain[i];
        const previousBlock = blockchain[i-1];
        
        const currBlockData = {
            transactions: currentBlock['transactions'],
            index: currentBlock['index']
        };
        const blockHash = this.hashBlock(previousBlock['hash'], currBlockData, currentBlock['nonce']);

        if(blockHash.substring(0, 4) !== '0000') validChain = false;
        if(currentBlock['previousBlockHash'] !== previousBlock['hash']) validChain = false;  
    }

    // Check Genesis Block 
    const genesisBlock = blockchain[0];
    const correctNonce = genesisBlock['nonce'] === 1;
    const correctPreviousHash = genesisBlock['previousBlockHash'] === '0';
    const correctHash = genesisBlock['hash'] === '0';
    const correctTransaction = genesisBlock['transactions'].length === 0;
    if(!correctHash || !correctNonce || !correctPreviousHash || !correctTransaction) validChain = false;

    return validChain;
};

// Export the Constructor Function
module.exports = Blockchain;