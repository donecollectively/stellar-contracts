import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
} from "vitest";

import {
    SampleTreasury,
    CharterDatumArgs,
    chTok,
} from "../src/examples/SampleTreasury";

import {
    Address,
    Datum,
    Value,
    Tx,
    TxOutput
} from "@hyperionbt/helios";

import { StellarTxnContext } from "../lib/StellarTxnContext";

import {
    ADA,
    StellarTestContext, 
    StellarCapoTestHelper,
    HelperFunctions,
    addTestContext,
    mkContext,
} from "../lib/StellarTestHelper"; //HeliosTestingContext

import {
    VestingParams,
    Vesting,
} from "../src/Vesting";

const it = itWithContext<localTC>;
const describe = descrWithContext<localTC>;
const fit = it.only

class VestingTestHelper extends StellarCapoTestHelper<SampleTreasury> {
    get stellarClass() {
        return SampleTreasury;
    }
    setupActors() {
        this.addActor("sasha", 1100n * ADA);
        this.addActor("pavel", 13n * ADA);
        this.addActor("tom", 120n * ADA);
        this.currentActor = "sasha";
    }

};

type localTC = StellarTestContext<SampleTreasuryTestHelper>;

describe("Vesting service", async () => {
    beforeEach<localTC>(async (context) => {
        await addTestContext(context, VestingTestHelper); //, VHelpers);
    });

	describe("baseline capabilities", () => {
	        fit("gets expected wallet balances for test-scenario actor", async (context: localTC) => {
		    const {h, h: { network, actors, delay, state }} = context;
		    const { sasha, tom, pavel }  = actors;

		    const tx = new Tx();
		    const sashaMoneyPre = await sasha.utxos;

		    tx.addInput(sashaMoneyPre[0]);
		    tx.addOutput(new TxOutput(sasha.address, new Value(3n * ADA)));
		    tx.addOutput(
			new TxOutput(
			    sasha.address,
			    new Value(sashaMoneyPre[0].value.lovelace - 5n * ADA)
			)
		    );
		    // console.log("s2")

		    await h.submitTx(tx);

		    const sashaMoney = await sasha.utxos;
		    const tomMoney = await tom.utxos;
		    const pavelMoney = await pavel.utxos;
		    expect(sashaMoney.length).toBe(2);
		    expect(sashaMoney[0].value.assets.nTokenTypes).toBe(0);
		    expect(sashaMoney[0].value.assets.isZero).toBeTruthy();
		    expect(sashaMoney[1].value.assets.isZero).toBeTruthy();


		    expect(sashaMoney[0].value.lovelace).toBe(1100n * ADA);
		    expect(sashaMoney[1].value.lovelace).toBe(5n * ADA);

		    expect(tomMoney[0].value.lovelace).toBe(120n * ADA);

		    expect(pavelMoney[0].value.lovelace).toBe(13n * ADA);
		});
		it("can access validator UTXO", async (context: localTC) => {
		    const {h, h: { network, actors, delay, state }} = context;
			const { sasha, tom, pavel } = actors;

			const v = new Vesting(context);
			const t = BigInt(Date.now());
			const deadline = t + BigInt(2*60*60*1000);

			const tcx = await v.mkTxnDepositValueForVesting({
				sponsor: pavel, // breaks with sasha
				payee: tom.address,
				deadline: deadline
			});

			const txId = await h.submitTx(tcx.tx, "force");

			const validatorAddress = Address.fromValidatorHash(v.compiledContract.validatorHash)
			const valUtxos = await network.getUtxos(validatorAddress)

			expect(valUtxos[0].origOutput.value.lovelace).toBe(13000000n);

		});
		it("can unlock value from validator ", async (context: localTC) => {
		    const {h, h: { network, actors, delay, state }} = context;
			const { sasha, tom, pavel } = actors;

			const v = new Vesting(context);
			const t = BigInt(Date.now());
			const d = t + BigInt(2*60*60*1000);

			const tcx = await v.mkTxnDepositValueForVesting({
				sponsor: sasha,   // need sasha  
				payee: pavel.address, // maybe pkh? 
				deadline: d
			});

			// explore the transaction data:
			expect(tcx.inputs[0].origOutput.value.lovelace).toBeTypeOf('bigint');
			expect(tcx.inputs[1].origOutput.value.lovelace).toBe(5000000n);
			expect(tcx.outputs[0].datum.data.toSchemaJson().length).toBe(175);

			const txId = await h.submitTx(tcx.tx, "force");

			expect((txId.hex).length).toBe(64);
			expect((await pavel.utxos).length).toBe(0);

			const validatorAddress = Address.fromValidatorHash(v.compiledContract.validatorHash)
			const valUtxos = await network.getUtxos(validatorAddress)

			const tcxClaim = await v.mkTxnClaimVestedValue(
				tom, 
				valUtxos[0],
				h.liveSlotParams.timeToSlot(t)
			);

			const txIdClaim = await h.submitTx(tcxClaim.tx, "force");

			const tomMoney = await tom.utxos;
			expect(tomMoney[0].value.lovelace).toBe(120000000n);
			expect(tomMoney[1].value.lovelace).toBe(13000000n);

		});
	});
});
