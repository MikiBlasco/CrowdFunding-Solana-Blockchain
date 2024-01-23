import './App.css';
import idl from "./idl.json"
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, AnchorProvider, web3, utils, BN } from '@project-serum/anchor';
import { useEffect, useState } from 'react';

const programID = new PublicKey(idl.metadata.address);
console.log(programID)
const network = clusterApiUrl("devnet");
const opts = {
  preflightComitment: "processed",
};
const { SystemProgram } = web3;

const App = () => {

  const [walletAddres, setWalletAddress] = useState(null);
  const [campaigns, setCampaigns] = useState([])

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightComitment)
    const provider = new AnchorProvider(
      connection,
      window.solana,
      opts.preflightComitment
    );
    return provider;
  }

  const checkIfWalletIsConected = async() => {

    try {
      const {solana} = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom Wallet found!')
          const response = await solana.connect({
            onlyIfTrusted: true,
          });
          console.log('Connected with public key',
          response.publicKey.toString()
          );
          setWalletAddress(response.publicKey.toString());
        } else {
          console.log('Solana Object not Found! Get a Phantom Wallet')
        }
      }
    } catch (error) {
      console.error(error)
    }
  };
  const connectWallet = async () => {

    const {solana} = window;

    if (solana) {
      const response = await solana.connect()
      console.log('Connected with public key', response.publicKey.toString())
      setWalletAddress(response.publicKey.toString())
    }
  };

  const getCampaigns = async () => {

    try{
      const connection = new Connection(network, opts.preflightComitment);
      console.log(connection)
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log('programID ', programID);
      const programAccounts = await connection.getProgramAccounts(programID, opts.preflightComitment);
      console.log(programAccounts)
      const campaignsList = await Promise.all(
        programAccounts.map(async (campaign) => ({
            ...(await program.account.campaign.fetch(campaign.pubkey)),
            pubkey: campaign.publicKey,
        }))
      );
      setCampaigns(campaignsList)
      console.log('campaigns', campaigns)
    } catch(error) {
      console.error('Error fetching Campaigns', error)
    }
  }

  const createCampaign = async () => {
    try {
      const provider = getProvider()
      const program = new Program(idl, programID, provider)
      const [campaign] = PublicKey.findProgramAddressSync(
      [
        utils.bytes.utf8.encode("CAMPAIN_DEMO"),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId, //calculat specific address for the campaign account
      console.log('program.programId', program.programId),
      );
        program.methods
              .initialize('campaign name', 'campaign description')
              .accounts({
                  campaign,
                  user: provider.wallet.publicKey,
                  systemProgram: SystemProgram.programId
              })

      console.log('Created a new Campaign w/ addfress: ', campaign.toString())
      console.log('opts.preflightComitment', opts.preflightComitment)
    } catch(error) {
      console.error('Error creating Campaign Account', error)
    }
  }

  const renderNotConnectedContainer = () => (
    <button onClick={connectWallet}>Connect to Wallet</button>
  )
  const renderConnectedContainer = () => (
    <>
    <button onClick={createCampaign}>Create Campaign</button>
    <button onClick={getCampaigns}>Get the list of Campaigns</button>
    <br />
    {campaigns.map(campaign => {
      <>
      <p>Campaign ID: {campaign.pubkey.toString()}</p>
      <p>Balance: {(campaign.amountDonated / web3.LAMPORTS_PER_SOL).toString()}</p>
      <p>{campaign.name}</p>
      <p>{campaign.description}</p>
      </>
    })}
    </>
  )

  useEffect(() => {

    const onLoad = async() => {
      await checkIfWalletIsConected()
    };

    window.addEventListener('load', onLoad);

    return () => window.removeEventListener('load', onLoad);
  }, []);

  return (  
  <div className='App'>
    {!walletAddres && renderNotConnectedContainer()}
    {walletAddres && renderConnectedContainer()}    
  </div>
  );
};

export default App;
