use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    pub struct Secret { pub symbols: [u8; 5] }

    /// The code is born inside MPC. There is no client-supplied secret and
    /// no Shared owner whose browser could decrypt it.
    #[instruction]
    pub fn seal_room() -> Enc<Mxe, Secret> {
        let mut symbols = [0u8; 5];
        for i in 0..5 {
            // Modulo reduction has negligible bias (at most 1 / 2^64).
            symbols[i] = (ArcisRNG::gen_integer_from_width(64) % 6) as u8;
        }
        Mxe::get().from_arcis(Secret { symbols })
    }

    /// Public guesses are deliberate: this is an open race of deduction.
    /// Reveal only two counts; never reveal the secret or position matches.
    #[instruction]
    pub fn check_guess(secret_ctxt: Enc<Mxe, Secret>, guess: [u8; 5]) -> (u8, u8) {
        let secret = secret_ctxt.to_arcis();
        let mut exact = 0u8;
        let mut total = 0u8;
        for i in 0..5 {
            if secret.symbols[i] == guess[i] { exact += 1; }
        }
        // Counting frequencies handles duplicate symbols without double-counting.
        for symbol in 0..6u8 {
            let mut secret_count = 0u8;
            let mut guess_count = 0u8;
            for i in 0..5 {
                if secret.symbols[i] == symbol { secret_count += 1; }
                if guess[i] == symbol { guess_count += 1; }
            }
            total += if secret_count < guess_count { secret_count } else { guess_count };
        }
        (exact.reveal(), (total - exact).reveal())
    }
}
