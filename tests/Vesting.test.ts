import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
} from "vitest";

import {
    DefaultCapo,
} from "../src/DefaultCapo";

import {
    Address,
    Datum,
    Value,
    Tx,
    TxOutput
} from "@hyperionbt/helios";

import { StellarTxnContext } from "../src/StellarTxnContext";

import {
    ADA,
    StellarTestContext, 
    StellarCapoTestHelper,
    HelperFunctions,
    addTestContext,
    mkContext,
} from "../src/testing/StellarTestHelper"; //HeliosTestingContext

import {
    VestingParams,
    Vesting,
} from "../src/Vesting";

const it = itWithContext<localTC>;
const describe = descrWithContext<localTC>;
const fit = it.only

class VestingTestHelper extends StellarCapoTestHelper<DefaultCapo> {
    get stellarClass() {
        return DefaultCapo;
    }
    setupActors() {
        this.addActor("sasha", 1100n * ADA);
        this.addActor("pavel", 13n * ADA);
        this.addActor("tom", 120n * ADA);
        this.currentActor = "tom";
    }

};

type localTC = StellarTestContext<SampleTreasuryTestHelper>;

describe("Vesting service", async () => {
    beforeEach<localTC>(async (context) => {
        await addTestContext(context, VestingTestHelper); //, VHelpers);
    });

	describe("baseline capabilities", () => {
		it("sasha can deposit correctly", async (context: localTC) => {
		    const {h, h: { network, actors, delay, state }} = context;
			const { sasha, tom, pavel } = actors;
			const t0 = h.network.currentSlot

			const v = new Vesting(context);
			const t = BigInt(Date.now());
			const deadline = t + BigInt(2*60*60*1000);

			const tcx = await v.mkTxnDepositValueForVesting({
				sponsor: sasha, 
				payee: pavel.address, 
				deadline: deadline
			});

			const txId = await h.submitTx(tcx.tx, "force");

			const validatorAddress = Address.fromValidatorHash(v.compiledContract.validatorHash)
			const valUtxos = await network.getUtxos(validatorAddress)
			const onchainDeadline = BigInt(JSON.parse(valUtxos[0].origOutput.datum.data.toSchemaJson()).list[2].int)

			const onchainAda = valUtxos[0].origOutput.value.lovelace
			expect(onchainAda).toBe(1100000000n);
			expect(onchainDeadline).toBe(deadline);

			const t1 = h.network.currentSlot
			expect(t1).toBeGreaterThan(t0)

		});
		it("sasha can lock and cancel", async (context: localTC) => {
		    const {h, h: { network, actors, delay, state }} = context;
			const { sasha, tom, pavel } = actors;

			async function splitUtxos(user: WalletEmulator ) {
				// duplicated
				const margin = 45n * ADA;
				const firstUtxo = (await user.utxos)[0]
				const secondUtxo = (await user.utxos)[1]
				const tx = new Tx();

				tx.addInput(firstUtxo);
				tx.addInput(secondUtxo);

				tx.addOutput(new TxOutput(user.address, new Value(10n * ADA)));
				tx.addOutput(new TxOutput(user.address, new Value(10n * ADA)));
				tx.addOutput(new TxOutput(user.address, new Value(10n * ADA)));
				tx.addOutput(new TxOutput(user.address, new Value(10n * ADA)));
				tx.addOutput(
				    new TxOutput(
					user.address,
					new Value(firstUtxo.value.lovelace - margin)
				    )
				);
				return h.submitTx(tx, "force"); // h. prevents abstracting
            		}

			const splitUtxo = await splitUtxos(sasha);

			// check if user has enough utxos to proceed with transactions:
			expect((await sasha.utxos).length).toBeGreaterThan(2);

			const v = new Vesting(context);

			// calculate the deadline:
			const timeAtDepo = Date.now();
			const offset =             53*365*24*60*60*1000; // years in milliseconds
			const deadline = BigInt(timeAtDepo + offset);
			// expect(deadline).toBeLessThan(1731162495000n); // Nov 9th, 2024

			const tcx = await v.mkTxnDepositValueForVesting({
				sponsor: sasha,
				payee: pavel.address, // maybe pkh? 
				deadline: BigInt(deadline)
			});

			const txId = await h.submitTx(tcx.tx, "force");

			const validatorAddress = Address.fromValidatorHash(v.compiledContract.validatorHash)
			const valUtxos = await network.getUtxos(validatorAddress)

			// can access deadline as number in Datum:
			const onchainDeadline = BigInt(JSON.parse(valUtxos[0].origOutput.datum.data.toSchemaJson()).list[2].int)
			expect(onchainDeadline).toBe(deadline);

			const validFrom = h.network.currentSlot

			expect(validFrom).toBeGreaterThan(1699619812n);

			// TODO: make more definitive case here:
			// sasha spent one utxo in the fees, so the new utxo must be 
			// amountVested + (inputUtxo.value - txFee)
			expect((await sasha.utxos).length).toBe(4);

			const tcxCancel = await v.mkTxnCancelVesting(
				sasha, 
				valUtxos[0],
				validFrom
			);

			const txIdCancel = await h.submitTx(tcxCancel.tx, "force");

			expect((await sasha.utxos).length).toBe(4);

		});
	});
	describe("check context correctness", () => {

	        it("verifies context correctness", async (context: localTC) => {
		    const {h, h: { network, actors, delay, state }} = context;
		    const { sasha, tom, pavel }  = actors;

		    // slot before any transaction:
		    expect(h.network.currentSlot).toBeGreaterThan(1699619451n);

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
		it("can access StellarTestHelper", async (context: localTC) => {
			const {h, h: { network, actors, delay, state }} = context;
			expect(h.currentSlot()).toBeTypeOf('bigint');
			expect(typeof(h.slotToTimestamp(h.currentSlot()))).toBe('object');
			expect(h.liveSlotParams.timeToSlot(2n)).toBe(0n);
			expect(h.liveSlotParams.timeToSlot(1000n)).toBe(1n);
		});
	});
});
