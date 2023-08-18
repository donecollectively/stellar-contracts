import { Address, Datum, TxOutput} from "@hyperionbt/helios";
import { StellarContract, redeem, datum, txn } from "../lib/StellarContract.js";
import contract from "./Vesting.hl";
import { StellarTxnContext } from "../lib/StellarTxnContext";

export type VestingParams = {
    sponsor: WalletEmulator;
    payee: Address;
    deadline: bigint;
};

export type VestingDatumArgs = {
    sponsor: PubKeyHash;
    payee: PubKeyHash;
    time: number | bigint;
};

export class Vesting extends StellarContract<VestingParams> {
    contractSource() {
        return contract;
    }
    @datum
    mkDatum({
        sponsor,
        payee,
	time
    }: VestingDatumArgs): InlineDatum {
        //!!! todo: make it possible to type these datum helpers more strongly
        const t = new this.configuredContract.types.Datum(
            sponsor.bytes,
	    payee.bytes,
            time
        );
        return Datum.inline(t._toUplcData());
    }
    @txn
    async mkTxnDepositValueForVesting(
        { sponsor, payee, deadline }: VestingParams,
        tcx: StellarTxnContext = new StellarTxnContext()
    ): Promise<StellarTxnContext | never> {
	    // so far value is hardcoded: 
		const inUtxo = (await sponsor.utxos)[0];
		const inUtxoFee = (await sponsor.utxos)[1];
		const lockedVal = inUtxo.value; // TODO: parametrize

		const validatorAddress = Address.fromValidatorHash(this.compiledContract.validatorHash)

		const inlineDatum = this.mkDatum({
			sponsor: sponsor.address.pubKeyHash,
			payee: payee.pubKeyHash,
			time: deadline
		});

		tcx.addInput(inUtxo)
		   .addInput(inUtxoFee)
		   .addOutput(new TxOutput(validatorAddress, lockedVal, inlineDatum));
	return tcx
    }
    @txn
    async mkTxnCancelVesting(
	sponsor: WalletEmulator,
	valUtxo: UTxO,
	// how does it get access to the currentSlot? 
	t0: bigint,
        tcx: StellarTxnContext = new StellarTxnContext()
    ): Promise<StellarTxnContext | never> {
	    // How does it work?
	    // It creates a Redeemer and serializes it:
	   const r = new this.configuredContract.types.Redeemer.Cancel();
	   const valRedeemer = r._toUplcData();

	   // finds enough utxos:
	   const collateralUtxo = (await sponsor.utxos)[0];
	   const feeUtxo = (await sponsor.utxos)[1];

	   // Calculates validity interval:
	   const t1 = t0 + 5000n

	   //creates the transaction and adds its components:
	   tcx.addInput(feeUtxo)
	   	.addInput(valUtxo, valRedeemer)
           	.addOutput(new TxOutput(sponsor.address, valUtxo.value))
           	
           	.attachScript(this.compiledContract)
           	.addCollateral(collateralUtxo);
	tcx.tx.addSigner(sponsor.address.pubKeyHash);
	// need to pass both, see junk/dev1
	tcx.tx.validFrom(t0);
	tcx.tx.validTo(t1);

	    return tcx
    }
    requirements() {
        return {
            "can deposit with gradual maturation": {
		// Principle: Code should make sense to a reader
                purpose: "",
                details: [
                // descriptive details of the requirement (not the tech):
			// 
		],
                mech: [
                // descriptive details of the chosen mechanisms for implementing the reqts:
			// a map : Date[] -> Amt[]
			// parse a list of utxos
		],
                requires: [
		// The vision for 'requires' is that it should link to another top-level reqts key.
			"can claim as payee",
			"Tx Rejected as payee",
			"can retrieve as sponsor",
			"Tx Rejected as sponsor",
		],
            },
            mkTxnClaim: {
                purpose: "can claim or retrieve vested funds",
                details: [
                // descriptive details of the requirement (not the tech):
		],
                mech: [
                // descriptive details of the chosen mechanisms for implementing the reqts:
		],
                requires: [
			"can find the correct utxo",
			"can serialize the Redeemer",
			"can access currentSlot",
			"mkTxnClaim can consume UTxO[]",
		],
            },
            mkDatum: {
                purpose: "uses contract parameters to produce a serialized Datum",
                details: [
                // descriptive details of the requirement (not the tech):
			// a Datum factory. Should provide convinient way to change Datum with changing reqts
		],
                mech: [
                // descriptive details of the chosen mechanisms for implementing the reqts:

// https://github.com/donecollectively/coco/blob/0370e87f4b9f1b6891935aebf9117224c61bb973/src/CommunityTreasury.ts#L120C28-L120C58
//     const t = new this.configuredContract.types.Datum.CharterToken(
//         trustees,
//         minSigs
//     );
//     return Datum.inline(t._toUplcData());
// }
// https://github.com/donecollectively/coco/blob/0370e87f4b9f1b6891935aebf9117224c61bb973/src/CommunityTreasury.hl#L7-L9
// enum Datum {
//    CharterToken {
//	    trustees: []Address
//	    minSigs: Int
//    }}
// But I have:
// struct Datum {
//     creator: PubKeyHash
//     beneficiary: PubKeyHash
//     deadline: Time
// }
		],
                requires: [
			"can find sponsor PubKeyHash",
			"can find payee PubKeyHash",
		],
            },
            mkTxDeposit: {
                purpose: "provide a utxo for Cancel and Claim inputs",
                details: [
		],
                mech: [
			// tx builder goes by hand;
			// TODO: automate and type Value.
			// Let tx builder consume a type compatible with Wallet and WalletEmulator
			// user story: amazon-like shopping cart - tina adds tokens from her wallet, then it finds utxos to make up the requested Value.
			// TODO: automate gradual maturation:
			// deadline -> deadlines[]
			// Value -> slices[]
		],
                requires: [
			"can find Sponsor utxo",
			"can create (inline) Datum" , 
			"knows correct validatorAddress"
		],
            },
            foo: {
		// Principle: Code should make sense to a reader
                purpose: "",
                details: [
                // descriptive details of the requirement (not the tech):
		],
                mech: [
                // descriptive details of the chosen mechanisms for implementing the reqts:
		],
                requires: [
		// The vision for 'requires' is that it should link to another top-level reqts key.
		],
            },
        };
    }
}
