use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;
const COMP_DEF_OFFSET_SEAL_ROOM: u32 = comp_def_offset("seal_room");
const COMP_DEF_OFFSET_CHECK_GUESS: u32 = comp_def_offset("check_guess");
declare_id!("13i1GnJ4sFiG6Tp9PoQggo9aRh5tcsZoBGLnZBrT4TLo");

#[arcium_program]
pub mod nopeek {
    use super::*;
    pub fn init_seal_room_comp_def(ctx: Context<InitSealRoomCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, None)?; Ok(())
    }
    pub fn init_check_guess_comp_def(ctx: Context<InitCheckGuessCompDef>) -> Result<()> {
        init_computation_def(ctx.accounts, None)?; Ok(())
    }
    pub fn seal_room(ctx: Context<SealRoom>, computation_offset: u64, id: u64, title: String) -> Result<()> {
        require!(!title.trim().is_empty() && title.len() <= 32, ErrorCode::BadInput);
        let room = &mut ctx.accounts.room;
        room.id = id;
        room.host = ctx.accounts.actor.key();
        room.title = title;
        room.created_at = Clock::get()?.unix_timestamp;
        room.expires_at = room.created_at + 86400;
        room.seal_offset = computation_offset;
        room.player_count = 1;
        room.players[0] = PlayerState { key: room.host, name: "Host".into(), attempts: 0, pending: false };
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        queue_computation(ctx.accounts, computation_offset, ArgBuilder::new().build(),
            vec![SealRoomCallback::callback_ix(computation_offset, &ctx.accounts.mxe_account,
                &[CallbackAccount { pubkey: ctx.accounts.room.key(), is_writable: true }])?], 1, 0, 0)?;
        Ok(())
    }
    #[arcium_callback(encrypted_ix = "seal_room")]
    pub fn seal_room_callback(ctx: Context<SealRoomCallback>, output: SignedComputationOutputs<SealRoomOutput>) -> Result<()> {
        let room = &mut ctx.accounts.room;
        require!(room.status == 0, ErrorCode::BadState);
        let result = match output.verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account) {
            Ok(SealRoomOutput { field_0 }) => field_0,
            Err(_) => { room.status = 5; return Ok(()); }
        };
        room.secret = result.ciphertexts;
        room.nonce = result.nonce;
        room.status = 1;
        Ok(())
    }
    pub fn join_room(ctx: Context<JoinRoom>, name: String) -> Result<()> {
        let room = &mut ctx.accounts.room;
        require!(room.status == 1 && Clock::get()?.unix_timestamp < room.expires_at, ErrorCode::BadState);
        require!(!name.trim().is_empty() && name.len() <= 24, ErrorCode::BadInput);
        require!(!room.players.iter().any(|p| p.key == ctx.accounts.actor.key()), ErrorCode::AlreadyJoined);
        require!(room.player_count < 4, ErrorCode::RoomFull);
        let index = room.player_count as usize;
        room.players[index] = PlayerState { key: ctx.accounts.actor.key(), name, attempts: 0, pending: false };
        room.player_count += 1;
        Ok(())
    }
    pub fn start_room(ctx: Context<HostRoom>) -> Result<()> {
        let room = &mut ctx.accounts.room;
        require!(room.status == 1 && Clock::get()?.unix_timestamp < room.expires_at, ErrorCode::BadState);
        room.status = 2;
        room.started_at = Clock::get()?.unix_timestamp;
        room.expires_at = room.started_at + 1200;
        Ok(())
    }
    pub fn check_guess(ctx: Context<CheckGuess>, computation_offset: u64, attempt_index: u8, symbols: [u8;5]) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let room = &mut ctx.accounts.room;
        require!(room.status == 2 && now < room.expires_at, ErrorCode::BadState);
        require!(symbols.iter().all(|s| *s < 6), ErrorCode::BadInput);
        let index = room.players.iter().position(|p| p.key == ctx.accounts.actor.key()).ok_or(ErrorCode::NotAuthorized)?;
        require!(!room.players[index].pending && room.players[index].attempts == attempt_index && attempt_index < 10, ErrorCode::AttemptsUnavailable);
        room.players[index].attempts += 1;
        room.players[index].pending = true;
        room.pending_count += 1;
        let attempt = &mut ctx.accounts.attempt;
        attempt.room = room.key();
        attempt.player = ctx.accounts.actor.key();
        attempt.index = attempt_index;
        attempt.symbols = symbols;
        attempt.queued_at = now;
        attempt.offset = computation_offset;
        let mut builder = ArgBuilder::new().plaintext_u128(room.nonce).account(room.key(), 8, 160);
        for symbol in symbols { builder = builder.plaintext_u8(symbol); }
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        queue_computation(ctx.accounts, computation_offset, builder.build(),
            vec![CheckGuessCallback::callback_ix(computation_offset, &ctx.accounts.mxe_account,
                &[CallbackAccount { pubkey: ctx.accounts.room.key(), is_writable: true },
                  CallbackAccount { pubkey: ctx.accounts.attempt.key(), is_writable: true }])?], 1, 0, 0)?;
        Ok(())
    }
    #[arcium_callback(encrypted_ix = "check_guess")]
    pub fn check_guess_callback(ctx: Context<CheckGuessCallback>, output: SignedComputationOutputs<CheckGuessOutput>) -> Result<()> {
        let room = &mut ctx.accounts.room;
        let attempt = &mut ctx.accounts.attempt;
        require!(attempt.room == room.key(), ErrorCode::NotAuthorized);
        // A canceled attempt can never become a late winner.
        if attempt.status != 0 { return Ok(()); }
        let index = room.players.iter().position(|p| p.key == attempt.player).ok_or(ErrorCode::NotAuthorized)?;
        room.players[index].pending = false;
        room.pending_count = room.pending_count.saturating_sub(1);
        match output.verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account) {
            Ok(CheckGuessOutput { field_0: CheckGuessOutputStruct0 { field_0, field_1 } }) => {
                require!(field_0 <= 5 && field_1 <= 5 && field_0 + field_1 <= 5, ErrorCode::BadInput);
                attempt.exact = field_0;
                attempt.misplaced = field_1;
                attempt.status = 1;
                if field_0 == 5 && room.status == 2 { room.status = 3; room.winner = attempt.player; }
            },
            Err(_) => { attempt.status = 2; }
        }
        room.maybe_end_round(Clock::get()?.unix_timestamp);
        Ok(())
    }
    pub fn recover_guess(ctx: Context<RecoverGuess>) -> Result<()> {
        let room = &mut ctx.accounts.room;
        let attempt = &mut ctx.accounts.attempt;
        require!(attempt.status == 0 && Clock::get()?.unix_timestamp >= attempt.queued_at + 180, ErrorCode::BadState);
        let index = room.players.iter().position(|p| p.key == ctx.accounts.actor.key()).ok_or(ErrorCode::NotAuthorized)?;
        attempt.status = 2;
        room.players[index].pending = false;
        room.pending_count = room.pending_count.saturating_sub(1);
        room.maybe_end_round(Clock::get()?.unix_timestamp);
        Ok(())
    }
    pub fn finish_room(ctx: Context<ReadRoom>) -> Result<()> {
        let room = &mut ctx.accounts.room;
        require!(room.status == 2 && room.pending_count == 0 && Clock::get()?.unix_timestamp >= room.expires_at, ErrorCode::BadState);
        room.status = 4; Ok(())
    }
}

#[queue_computation_accounts("seal_room", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64, id: u64)]
pub struct SealRoom<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(
        mut,
        address = derive_mempool_pda!(mxe_account)
    )]
    /// CHECK: mempool_account, checked by the arcium program
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!(mxe_account)
    )]
    /// CHECK: executing_pool, checked by the arcium program
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset, mxe_account)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_SEAL_ROOM)
    )]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        mut,
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS,
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,

    pub actor: Signer<'info>,
    #[account(init, payer = payer, space = 8 + Room::INIT_SPACE, seeds = [b"room".as_ref(), id.to_le_bytes().as_ref()], bump)]
    pub room: Box<Account<'info, Room>>,
}

#[callback_accounts("seal_room")]
#[derive(Accounts)]
pub struct SealRoomCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_SEAL_ROOM)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account, checked by arcium program via constraints in the callback context.
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(address = ::arcium_anchor::solana_instructions_sysvar::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: UncheckedAccount<'info>,

    #[account(mut)]
    pub room: Box<Account<'info, Room>>,
}

#[init_computation_definition_accounts("seal_room", payer)]
#[derive(Accounts)]
pub struct InitSealRoomCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    /// Can't check it here as it's not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("check_guess", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64, attempt_index: u8)]
pub struct CheckGuess<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(
        mut,
        address = derive_mempool_pda!(mxe_account)
    )]
    /// CHECK: mempool_account, checked by the arcium program
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!(mxe_account)
    )]
    /// CHECK: executing_pool, checked by the arcium program
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset, mxe_account)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_CHECK_GUESS)
    )]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        mut,
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS,
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,

    pub actor: Signer<'info>,
    #[account(mut)]
    pub room: Box<Account<'info, Room>>,
    #[account(init, payer = payer, space = 8 + Attempt::INIT_SPACE,
        seeds = [b"attempt", room.key().as_ref(), actor.key().as_ref(), &[attempt_index]], bump)]
    pub attempt: Box<Account<'info, Attempt>>,
}

#[callback_accounts("check_guess")]
#[derive(Accounts)]
pub struct CheckGuessCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_CHECK_GUESS)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account, checked by arcium program via constraints in the callback context.
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(address = ::arcium_anchor::solana_instructions_sysvar::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: UncheckedAccount<'info>,

    #[account(mut)]
    pub room: Box<Account<'info, Room>>,
    #[account(mut)]
    pub attempt: Box<Account<'info, Attempt>>,
}

#[init_computation_definition_accounts("check_guess", payer)]
#[derive(Accounts)]
pub struct InitCheckGuessCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    /// Can't check it here as it's not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct JoinRoom<'info> {
    pub actor: Signer<'info>,
    #[account(mut)] pub room: Box<Account<'info, Room>>,
}
#[derive(Accounts)]
pub struct HostRoom<'info> {
    pub actor: Signer<'info>,
    #[account(mut, constraint = room.host == actor.key() @ ErrorCode::NotAuthorized)]
    pub room: Box<Account<'info, Room>>,
}
#[derive(Accounts)]
pub struct ReadRoom<'info> {
    #[account(mut)] pub room: Box<Account<'info, Room>>,
}
#[derive(Accounts)]
pub struct RecoverGuess<'info> {
    pub actor: Signer<'info>,
    #[account(mut)] pub room: Box<Account<'info, Room>>,
    #[account(mut, constraint = attempt.room == room.key() @ ErrorCode::NotAuthorized,
        constraint = attempt.player == actor.key() @ ErrorCode::NotAuthorized)]
    pub attempt: Box<Account<'info, Attempt>>,
}
#[account]
#[derive(InitSpace, Default)]
pub struct Room {
    // Must remain first: ArgBuilder::account reads 160 bytes at offset 8.
    pub secret: [[u8;32];5],
    pub nonce: u128,
    pub id: u64,
    pub host: Pubkey,
    #[max_len(32)] pub title: String,
    pub created_at: i64,
    pub started_at: i64,
    pub expires_at: i64,
    pub seal_offset: u64,
    pub status: u8,
    pub winner: Pubkey,
    pub player_count: u8,
    pub pending_count: u8,
    pub players: [PlayerState;4],
}
impl Room {
    fn maybe_end_round(&mut self, now: i64) {
        if self.status == 2 && self.pending_count == 0 && self.player_count > 0 &&
            (now >= self.expires_at || self.players[..self.player_count as usize].iter().all(|p| p.attempts >= 10)) {
            self.status = 4;
        }
    }
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, Default)]
pub struct PlayerState {
    pub key: Pubkey,
    #[max_len(24)] pub name: String,
    pub attempts: u8,
    pub pending: bool,
}
#[account]
#[derive(InitSpace)]
pub struct Attempt {
    pub room: Pubkey,
    pub player: Pubkey,
    pub index: u8,
    pub symbols: [u8;5],
    pub exact: u8,
    pub misplaced: u8,
    pub status: u8,
    pub queued_at: i64,
    pub offset: u64,
}
#[error_code]
pub enum ErrorCode {
    #[msg("This action is not available in the current room state.")] BadState,
    #[msg("Only an authorized player can do this.")] NotAuthorized,
    #[msg("Choose five symbols between 0 and 5, or a shorter name.")] BadInput,
    #[msg("This player is already in the room.")] AlreadyJoined,
    #[msg("The room already has four players.")] RoomFull,
    #[msg("Wait for your pending clue, or start a new room if you used all ten attempts.")] AttemptsUnavailable,
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn an_inflight_predeadline_guess_can_still_finish() {
        let mut room = Room { status: 2, player_count: 1, pending_count: 1, expires_at: 100, ..Room::default() };
        room.maybe_end_round(101);
        assert_eq!(room.status, 2);
        room.pending_count = 0;
        room.maybe_end_round(101);
        assert_eq!(room.status, 4);
    }
    #[test]
    fn final_canceled_attempt_ends_the_round() {
        for count in 1..=4 {
            let mut room = Room { status: 2, player_count: count, expires_at: 100, ..Room::default() };
            for player in &mut room.players[..count as usize] { player.attempts = 10; }
            room.maybe_end_round(50);
            assert_eq!(room.status, 4);
        }
    }
    #[test]
    fn available_attempts_and_recorded_winners_are_preserved() {
        let mut room = Room { status: 2, player_count: 2, expires_at: 100, ..Room::default() };
        room.players[0].attempts = 10;
        room.players[1].attempts = 9;
        room.maybe_end_round(50);
        assert_eq!(room.status, 2);
        room.status = 3;
        room.maybe_end_round(101);
        assert_eq!(room.status, 3);
    }
}
