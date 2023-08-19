// import functionalities
import './App.css';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { useEffect, useState } from "react";
import './App.css'

// import to fix polyfill issue with buffer with webpack
import * as buffer from "buffer";
window.Buffer = buffer.Buffer;


// create types
type DisplayEncoding = "utf8" | "hex";

type PhantomEvent = "disconnect" | "connect" | "accountChanged";
type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

// create a provider interface (hint: think of this as an object) to store the Phantom Provider
interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

/**
* @description gets Phantom provider, if it exists
*/

const getProvider = (): PhantomProvider | undefined => {
  if ("solana" in window) {
    // @ts-ignore
    const provider = window.solana as any;
    if (provider.isPhantom) return provider as PhantomProvider;
  }
};


/*const getProvider = () => {
  if ("phantom" in window) {
    const provider = window.phantom?.solana;
    if (provider?.isPhantom) return provider;
  }
};*/

export default function App() {
  const [walletAddress, setWalletAddress] = useState<PublicKey | undefined>(
    undefined
  );

  const [walletBalance, setWalletBalance] = useState<any | undefined>(
    undefined
  );
  // create state variable for the provider
  const [provider, setProvider] = useState<PhantomProvider | undefined>(
    undefined
  );

  // create state variable for the phantom wallet key
  const [receiverPublicKey, setReceiverPublicKey] = useState<PublicKey | undefined>(
    undefined
  );

  // create state variable for the sender wallet key
  const [senderKeypair, setSenderKeypair] = useState<any | undefined>(
    undefined
  );

  const [userPrivateKey, setUserPrivateKey] = useState<any | undefined>(undefined); //new


  // create a state variable for our connection
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // connection to use with local solana test validator
  //const connection = new Connection("http://127.0.0.1:8899", "confirmed");

  // this is the function that runs whenever the component updates (e.g. render, refresh)
  useEffect(() => {
    const provider = getProvider();

    // if the phantom provider exists, set this as the provider
    if (provider) setProvider(provider);
    else setProvider(undefined);
  }, []);

  /**
   * @description creates a new KeyPair and airdrops 2 SOL into it.
   * This function is called when the Create a New Solana Account button is clicked
   */

  const createSender = async () => { //new
    // @ts-ignore
    const { solana } = window;
    if (solana) {
      try {
        //  create a new Keypair
        const newPair = new Keypair();
        const publicKey = new PublicKey(newPair.publicKey).toString();
        const privateKey = newPair.secretKey;

        setUserPrivateKey(privateKey);

        console.log('Sender account: ', publicKey.toString());
        console.log('Airdropping 2 SOL to Sender Wallet');

        // save this new KeyPair into this state variable
        setSenderKeypair(newPair);

        // request airdrop into this new account
        const fromAirDropSignature = await connection.requestAirdrop(
          newPair.publicKey,
          2 * LAMPORTS_PER_SOL
        );


        const latestBlockHash = await connection.getLatestBlockhash();

        // now confirm the transaction
        await connection.confirmTransaction({
          blockhash: latestBlockHash.blockhash,
          lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
          signature: fromAirDropSignature
        });

        console.log("Airdrop completed for the Sender account");

        console.log('Wallet Balance: ' + (await connection.getBalance(newPair.publicKey)) / LAMPORTS_PER_SOL);


      } catch (err) {

      }
    }
  };

  /**
   * @description prompts user to connect wallet if it exists.
   * This function is called when the Connect to Phantom Wallet button is clicked
   */
  const connectWallet = async () => {
    // @ts-ignore
    const { solana } = window;

    // checks if phantom wallet exists
    if (solana) {
      try {
        // connect to phantom wallet and return response which includes the wallet public key
        const response = await solana.connect();
        console.log('Connected Wallet Address: ', response.publicKey.toString());

        // save the public key of the phantom wallet to the state variable
        setReceiverPublicKey(response.publicKey.toString());
        setWalletAddress(response.publicKey);

        // get wallet balance
        const walletBalance = await connection.getBalance(
          new PublicKey(response.publicKey.toString())
        );


        // set wallet balance
        setWalletBalance(walletBalance);
      } catch (err) {
        console.log(err);
      }
    }
  };

  /**
   * @description disconnects wallet if it exists.
   * This function is called when the disconnect wallet button is clicked
   */
  const disconnectWallet = async () => {
    // @ts-ignore
    const { solana } = window;

    // checks if phantom wallet exists
    if (solana) {
      try {
        solana.disconnect();
        setReceiverPublicKey(undefined);
        console.log("wallet disconnected")
      } catch (err) {
        console.log(err);
      }
    }
  };

  /**
   * @description transfer SOL from sender wallet to connected wallet.
   * This function is called when the Transfer SOL to Phantom Wallet button is clicked
   */
  const transferSol = async () => {
    if (walletAddress) {
      const lamportsToSend = 1 * LAMPORTS_PER_SOL;

      // create a new transaction for the transfer
      var transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderKeypair.publicKey,
          toPubkey: walletAddress,
          lamports: lamportsToSend,
        })
      );

      // Sign transaction
      var signature = await sendAndConfirmTransaction(connection, transaction, [
        senderKeypair,
      ]);

      console.log({ signature });

      // send and confirm the transaction

      console.log("Sender Balance: " + await connection.getBalance(senderKeypair.publicKey) / LAMPORTS_PER_SOL);
      console.log("Receiver Balance: " + await connection.getBalance(walletAddress) / LAMPORTS_PER_SOL);

      const walletBal = await connection.getBalance(walletAddress);
      setWalletBalance(walletBal);
    }
  };

  // HTML code for the app
  return (
    <div className="App">
      <header className="App-header">
        <h2>Module 2 Assessment</h2>
        <h3> {walletBalance ? `${parseInt(walletBalance) / LAMPORTS_PER_SOL} SOL` : `Connect Wallet to view Balance`}</h3>
        <span className="buttons">
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={createSender}
          >
            Create a New Solana Account
          </button>
          {provider && !receiverPublicKey && (
            <button
              style={{
                fontSize: "16px",
                padding: "15px",
                fontWeight: "bold",
                borderRadius: "5px",
              }}
              onClick={connectWallet}
            >
              Connect to Phantom Wallet
            </button>
          )}
          {provider && receiverPublicKey && (
            <div>
              <button
                style={{
                  fontSize: "16px",
                  padding: "15px",
                  fontWeight: "bold",
                  borderRadius: "5px",
                  position: "absolute",
                  top: "28px",
                  right: "28px"
                }}
                onClick={disconnectWallet}
              >
                Disconnect from Wallet
              </button>
            </div>
          )}
          {provider && receiverPublicKey && senderKeypair && (
            <button
              style={{
                fontSize: "16px",
                padding: "15px",
                fontWeight: "bold",
                borderRadius: "5px",
              }}
              onClick={transferSol}
            >
              Transfer SOL to Phantom Wallet
            </button>
          )}
        </span>
        {!provider && (
          <p>
            No provider found. Install{" "}
            <a href="https://phantom.app/">Phantom Browser extension</a>
          </p>
        )}
      </header>
    </div>
  );
}