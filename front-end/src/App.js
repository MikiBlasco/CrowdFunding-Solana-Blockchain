import './App.css';
import idl from "./idl.json"
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, AnchorProvider, web3, utils, BN } from '@project-serum/anchor';
import { useEffect, useState } from 'react';
import { Buffer } from 'buffer';
window.Buffer = Buffer;

const programID = new PublicKey(idl.metadata.address);
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

  // const getCampaigns = async () => {

  //   try{
  //     const connection = new Connection(network, opts.preflightComitment);
  //     const provider = getProvider();
  //     const program = new Program(idl, programID, provider);
  //     console.log('program =>', program)
  //     Promise.all(
  //       (await connection.getProgramAccounts(programID)).map(
  //         async (campaign) => ({
  //           ...(await program.account.campaign.fetch(campaign.pubkey)),
  //           pubkey: campaign.pubkey,
  //         })
  //       )
  //     ).then((campaigns) => setCampaigns(campaigns));
  //     console.log('campaigns List =>' , campaigns)
  //   } catch(error) {
  //     console.error('Error fetching Campaigns', error)
  //   }
  // }
  const getCampaigns = async () => {
    try {
      const connection = new Connection(network, opts.preflightComitment);
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
  
      // Using Promise.allSettled to wait for all promises to resolve or reject
      const campaignPromises = (await connection.getProgramAccounts(programID)).map(
        async (campaign) => ({
          ...(await program.account.campaign.fetch(campaign.pubkey)),
          pubkey: campaign.pubkey,
        })
      );
  
      Promise.allSettled(campaignPromises)
        .then((results) => {
          // Filter out successfully resolved promises and get the campaigns
          const successfulResults = results.filter((result) => result.status === 'fulfilled');
          const campaignsData = successfulResults.map((result) => result.value);
          setCampaigns(campaignsData);
          console.log('campaigns List =>', campaignsData);
        })
        .catch((error) => {
          console.error('Error fetching Campaigns', error);
        });
    } catch (error) {
      console.error('Error fetching Campaigns', error);
    }
  };

  const createCampaign = async () => {
    try {
      const provider = getProvider()
      const program = new Program(idl, programID, provider)
      const [campaign] = PublicKey.findProgramAddressSync(
      [
        utils.bytes.utf8.encode("CAMPAIGN_DEMO1"),
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
              }).rpc()

      console.log('Created a new Campaign w/ addfress: ', campaign.toString())
    } catch(error) {
      console.error('Error creating Campaign Account', error)
    }
  }

  const renderNotConnectedContainer = () => (
    <button onClick={connectWallet}>Connect to Wallet</button>
  )
  // const renderConnectedContainer = () => (
  //   <>
  //   <button onClick={createCampaign}>Create Campaign</button>
  //   <button onClick={getCampaigns}>Get the list of Campaigns</button>
  //   <br />
  //   {campaigns.map(campaign => {
  //     <>
  //     <p>Campaign ID: {campaign.pubkey}</p>
  //     <p>Balance: {(campaign.amountDonated / web3.LAMPORTS_PER_SOL)}</p>
  //     <p>{campaign.name}</p>
  //     <p>{campaign.description}</p>
  //     </>
  //   })}
  //   </>
  // )

  const renderConnectedContainer = () => (
    <>
      <button onClick={createCampaign}>Create Campaign</button>
      <button onClick={getCampaigns}>Get the list of Campaigns</button>
      <br />
      {campaigns.map((campaign) => (
        <div key={campaign.pubkey.toString()}> {/* Convert PublicKey to string */}
          <p>Campaign ID: {campaign.pubkey.toString()}</p>
          <p>Balance: {(campaign.amountDonated / web3.LAMPORTS_PER_SOL)}</p>
          <p>{campaign.name}</p>
          <p>{campaign.description}</p>
        </div>
      ))}
    </>
  );

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
