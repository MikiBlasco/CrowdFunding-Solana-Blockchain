use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;

declare_id!("EiU3xntDy5FurzZW8V8DG93m4q2KPsDt4Y1bE7Vt6aNv");

#[program]
pub mod crowdfunding {
    
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>, name: String, description: String) -> ProgramResult {
        let campaign = &mut _ctx.accounts.campaign;
        campaign.name = name;
        campaign.description = description;
        campaign.amount_donated = 0;
        campaign.admin = *_ctx.accounts.user.key; //user for whoever created the campaign.
        Ok(())
    }

    pub fn withdraw(_ctx: Context<Withdraw>, amount: u64) -> ProgramResult {
        let campaign = &mut _ctx.accounts.campaign;
        let user = &mut _ctx.accounts.user;
        if campaign.admin != *user.key {
            return Err(ProgramError::IncorrectProgramId)
        }
        let rent_balance = Rent::get()?.minimum_balance(campaign.to_account_info().data_len());
        if **campaign.to_account_info().lamports.borrow() - rent_balance < amount {
            return Err(ProgramError::InsufficientFunds);
        }
        **campaign.to_account_info().try_borrow_mut_lamports()? -= amount;
        **user.to_account_info().try_borrow_mut_lamports()? += amount;
        Ok(())
    }

    pub fn donate(_ctx:Context<Donate>, amount: u64) -> ProgramResult {
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            & _ctx.accounts.user.key(), 
            &_ctx.accounts.campaign.key(), 
            amount
        );
        anchor_lang::solana_program::program::invoke(
            &ix, 
            &[
                _ctx.accounts.user.to_account_info(), 
                _ctx.accounts.campaign.to_account_info()
                ]
            );
            
        (&mut _ctx.accounts.campaign).amount_donated += amount;
        Ok(())
    }
}
//this is a Macro that creates context#
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer=user, space=9000, seeds=[b"CAMPAIN_DEMO".as_ref(), user.key().as_ref()], bump)] 
    pub campaign: Account<'info, Campaign>,
    #[account(mut)] //the user can be changed 
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct Donate<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>
}

#[account]
pub struct Campaign {
    pub admin: Pubkey,
    pub name: String,
    pub amount_donated: u64,
    pub description: String
}
