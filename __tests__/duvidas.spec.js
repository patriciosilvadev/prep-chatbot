const cont = require('./context');
const duvidas = require('../app/utils/duvidas');
const flow = require('../app/utils/flow');
const { sendMain } = require('../app/utils/mainMenu');
const { getQR } = require('../app/utils/attach');

jest.mock('../app/utils/flow');
jest.mock('../app/utils/mainMenu');
jest.mock('../app/utils/attach');

describe('prepFollowUp - Dúvidas para PrER seguimento', async () => {
	it('SUS - MG', async () => {
		const context = cont.quickReplyContext('duvidasPrep', 'duvidasPrep');
		context.state.user.voucher_type = 'sus';
		context.state.user.city = '1';
		await duvidas.prepFollowUp(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasPrep.prefixSUS + flow.duvidasPrep.textosSUS[context.state.user.city]);
		await expect(sendMain).toBeCalledWith(context);
	});

	it('SUS - BA', async () => {
		const context = cont.quickReplyContext('duvidasPrep', 'duvidasPrep');
		context.state.user.voucher_type = 'sus';
		context.state.user.city = 2;
		await duvidas.prepFollowUp(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasPrep.prefixSUS + flow.duvidasPrep.textosSUS[context.state.user.city]);
		await expect(sendMain).toBeCalledWith(context);
	});

	it('SUS - SP', async () => {
		const context = cont.quickReplyContext('duvidasPrep', 'duvidasPrep');
		context.state.user.voucher_type = 'sus';
		context.state.user.city = 2;
		await duvidas.prepFollowUp(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasPrep.prefixSUS + flow.duvidasPrep.textosSUS[context.state.user.city]);
		await expect(sendMain).toBeCalledWith(context);
	});

	it('SUS - No city', async () => {
		const context = cont.quickReplyContext('duvidasPrep', 'duvidasPrep');
		context.state.user.voucher_type = 'sus';
		context.state.user.city = 10;
		await duvidas.prepFollowUp(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasPrep.prefixSUS + flow.duvidasPrep.demaisLocalidades);
		await expect(sendMain).toBeCalledWith(context);
	});

	it('Not SUS - No city', async () => {
		const context = cont.quickReplyContext('duvidasPrep', 'duvidasPrep');
		context.state.user.voucher_type = 'combina';
		await duvidas.prepFollowUp(context);

		await expect(context.setState).toBeCalledWith({ nextDialog: '' });
		await expect(context.sendText).toBeCalledWith(flow.duvidasPrep.notSUS, await getQR(flow.ofertaPesquisaSim));
	});
});

describe('deuRuimPrepFollowUp', async () => {
	it('SUS - vê mensagem e vai pro menu', async () => {
		const context = cont.quickReplyContext('deuRuimPrepFollowUp', 'deuRuimPrepFollowUp');
		context.state.user.voucher_type = 'sus';

		await duvidas.deuRuimPrepFollowUp(context);

		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.followUpSUS);
		await expect(sendMain).toBeCalledWith(context);
	});

	it('Not SUS - fluxo falar com humano', async () => {
		const context = cont.quickReplyContext('deuRuimPrepFollowUp', 'deuRuimPrepFollowUp');
		context.state.user.voucher_type = 'combina';

		await duvidas.deuRuimPrepFollowUp(context);

		await expect(context.setState).toBeCalledWith({ nextDialog: '' });
		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.notSUS, await getQR(flow.ofertaPesquisaSim));
	});

	it('Efeito - SUS - vê mensagem incial, vê mensagem e vai pro menu', async () => {
		const context = cont.quickReplyContext('deuRuimPrepFollowUp', 'deuRuimPrepFollowUp');
		context.state.user.voucher_type = 'sus';
		const msgExtra = 'foobar';

		await duvidas.deuRuimPrepFollowUp(context, msgExtra);

		await expect(context.sendText).toBeCalledWith(msgExtra);
		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.followUpSUS);
		await expect(sendMain).toBeCalledWith(context);
	});

	it('Efeito - Not SUS - vê mensagem incial, fluxo falar com humano', async () => {
		const context = cont.quickReplyContext('deuRuimPrepFollowUp', 'deuRuimPrepFollowUp');
		context.state.user.voucher_type = 'combina';
		const msgExtra = 'foobar';

		await duvidas.deuRuimPrepFollowUp(context, msgExtra);

		await expect(context.sendText).toBeCalledWith(msgExtra);
		await expect(context.setState).toBeCalledWith({ nextDialog: '' });
		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.notSUS, await getQR(flow.ofertaPesquisaSim));
	});

	it('Efeito - SUS - vê mensagem incial, vê mensagem e vai pro menu', async () => {
		const context = cont.quickReplyContext('deuRuimPrepFollowUp', 'deuRuimPrepFollowUp');
		context.state.user.voucher_type = 'sus';
		const msgExtra = 'foobar';

		await duvidas.deuRuimPrepFollowUp(context, msgExtra);

		await expect(context.sendText).toBeCalledWith(msgExtra);
		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.followUpSUS);
		await expect(sendMain).toBeCalledWith(context);
	});

	it('Não manda mensagem inicial se não for string', async () => {
		const context = cont.quickReplyContext('deuRuimPrepFollowUp', 'deuRuimPrepFollowUp');
		context.state.user.voucher_type = 'sus';
		const msgExtra = {};

		await duvidas.deuRuimPrepFollowUp(context, msgExtra);

		await expect(context.sendText).not.toBeCalledWith(msgExtra);
		await expect(context.sendText).toBeCalledWith(flow.deuRuimPrep.followUpSUS);
		await expect(sendMain).toBeCalledWith(context);
	});
});

describe('alarmeOK', async () => {
	it('combina', async () => {
		const context = cont.quickReplyContext('alarmeOK', 'alarmeOK');
		context.state.user.voucher_type = 'combina';

		await duvidas.alarmeOK(context);
		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.comoTomando.text1, await getQR(flow.alarmePrep.comoTomando));
	});

	it('sisprep', async () => {
		const context = cont.quickReplyContext('alarmeOK', 'alarmeOK');
		context.state.user.voucher_type = 'sisprep';

		await duvidas.alarmeOK(context);
		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.comoAjudo.text1, await getQR(flow.alarmePrep.comoAjudo));
	});
});


describe('alarmeHorario', async () => {
	it('page 1 (horaAlarme) - tipo 1', async () => {
		const alarmePage = 1;
		const pageKey = 'horaAlarme';

		let result = await duvidas.alarmeHorario(alarmePage, pageKey);
		result = result.quick_replies;

		await expect(result.length === 10).toBeTruthy();

		await expect(result[0].title === 'Mais Cedo').toBeTruthy();
		await expect(result[1].title === 'As 8').toBeTruthy();
		await expect(result[2].title === 'As 9').toBeTruthy();
		await expect(result[3].title === 'As 10').toBeTruthy();
		await expect(result[4].title === 'As 11').toBeTruthy();
		await expect(result[5].title === 'As 12').toBeTruthy();
		await expect(result[6].title === 'As 13').toBeTruthy();
		await expect(result[7].title === 'As 14').toBeTruthy();
		await expect(result[8].title === 'As 15').toBeTruthy();
		await expect(result[9].title === 'Mais Tarde').toBeTruthy();

		await expect(result[0].payload === `page${pageKey}0`).toBeTruthy();
		await expect(result[1].payload === `${pageKey}8`).toBeTruthy();
		await expect(result[2].payload === `${pageKey}9`).toBeTruthy();
		await expect(result[3].payload === `${pageKey}10`).toBeTruthy();
		await expect(result[4].payload === `${pageKey}11`).toBeTruthy();
		await expect(result[5].payload === `${pageKey}12`).toBeTruthy();
		await expect(result[6].payload === `${pageKey}13`).toBeTruthy();
		await expect(result[7].payload === `${pageKey}14`).toBeTruthy();
		await expect(result[8].payload === `${pageKey}15`).toBeTruthy();
		await expect(result[9].payload === `page${pageKey}${alarmePage + 1}`).toBeTruthy();
	});

	it('page 0 (tomeiDepois) - tipo 2', async () => {
		const alarmePage = 0;
		const pageKey = 'tomeiDepois';

		let result = await duvidas.alarmeHorario(alarmePage, pageKey, 2);
		result = result.quick_replies;

		await expect(result.length === 9).toBeTruthy();

		await expect(result[0].title === 'Mais Cedo').toBeTruthy();
		await expect(result[1].title === '1 hora antes').toBeTruthy();
		await expect(result[2].title === '2 horas antes').toBeTruthy();
		await expect(result[3].title === '3 horas antes').toBeTruthy();
		await expect(result[4].title === '4 horas antes').toBeTruthy();
		await expect(result[5].title === '5 horas antes').toBeTruthy();
		await expect(result[6].title === '6 horas antes').toBeTruthy();
		await expect(result[7].title === '7 horas antes').toBeTruthy();
		await expect(result[8].title === 'Mais Tarde').toBeTruthy();

		await expect(result[0].payload === `page${pageKey}${alarmePage - 1}`).toBeTruthy();
		await expect(result[1].payload === `${pageKey}1`).toBeTruthy();
		await expect(result[2].payload === `${pageKey}2`).toBeTruthy();
		await expect(result[3].payload === `${pageKey}3`).toBeTruthy();
		await expect(result[4].payload === `${pageKey}4`).toBeTruthy();
		await expect(result[5].payload === `${pageKey}5`).toBeTruthy();
		await expect(result[6].payload === `${pageKey}6`).toBeTruthy();
		await expect(result[7].payload === `${pageKey}7`).toBeTruthy();
		await expect(result[8].payload === `page${pageKey}${alarmePage + 1}`).toBeTruthy();
	});

	it('page 0 and page after 2 is equal to 0 (tomeiDepois)', async () => {
		let alarmePage = 0;
		let pageKey = 'tomeiDepois';

		let result1 = await duvidas.alarmeHorario(alarmePage, pageKey, 1);
		result1 = result1.quick_replies;

		await expect(result1.length === 10).toBeTruthy();

		await expect(result1[0].title === 'Mais Cedo').toBeTruthy();
		await expect(result1[1].title === 'As 0').toBeTruthy();
		await expect(result1[2].title === 'A 1').toBeTruthy();
		await expect(result1[3].title === 'As 2').toBeTruthy();
		await expect(result1[4].title === 'As 3').toBeTruthy();
		await expect(result1[5].title === 'As 4').toBeTruthy();
		await expect(result1[6].title === 'As 5').toBeTruthy();
		await expect(result1[7].title === 'As 6').toBeTruthy();
		await expect(result1[8].title === 'As 7').toBeTruthy();
		await expect(result1[9].title === 'Mais Tarde').toBeTruthy();

		await expect(result1[0].payload === `page${pageKey}${alarmePage - 1}`).toBeTruthy();
		await expect(result1[1].payload === `${pageKey}0`).toBeTruthy();
		await expect(result1[2].payload === `${pageKey}1`).toBeTruthy();
		await expect(result1[3].payload === `${pageKey}2`).toBeTruthy();
		await expect(result1[4].payload === `${pageKey}3`).toBeTruthy();
		await expect(result1[5].payload === `${pageKey}4`).toBeTruthy();
		await expect(result1[6].payload === `${pageKey}5`).toBeTruthy();
		await expect(result1[7].payload === `${pageKey}6`).toBeTruthy();
		await expect(result1[8].payload === `${pageKey}7`).toBeTruthy();
		await expect(result1[9].payload === `page${pageKey}${alarmePage + 1}`).toBeTruthy();

		alarmePage = 3;
		pageKey = 'tomeiDepois';

		let result2 = await duvidas.alarmeHorario(alarmePage, 'tomeiDepois', 1);
		result2 = result2.quick_replies;

		result1.forEach((e, i) => {
			Object.keys(result1[i]).forEach((key) => {
				expect(result1[i][key] === result2[i][key]).toBeTruthy();
			});
		});
	});

	it('page 2 and page before 0 is equal to page 2 (tomeiHora)', async () => {
		let alarmePage = 2;
		let pageKey = 'tomeiHora';

		let result1 = await duvidas.alarmeHorario(alarmePage, pageKey);
		result1 = result1.quick_replies;

		await expect(result1.length === 10).toBeTruthy();

		await expect(result1[0].title === 'Mais Cedo').toBeTruthy();
		await expect(result1[1].title === 'As 16').toBeTruthy();
		await expect(result1[2].title === 'As 17').toBeTruthy();
		await expect(result1[3].title === 'As 18').toBeTruthy();
		await expect(result1[4].title === 'As 19').toBeTruthy();
		await expect(result1[5].title === 'As 20').toBeTruthy();
		await expect(result1[6].title === 'As 21').toBeTruthy();
		await expect(result1[7].title === 'As 22').toBeTruthy();
		await expect(result1[8].title === 'As 23').toBeTruthy();
		await expect(result1[9].title === 'Mais Tarde').toBeTruthy();

		await expect(result1[0].payload === `page${pageKey}${alarmePage - 1}`).toBeTruthy();
		await expect(result1[1].payload === `${pageKey}16`).toBeTruthy();
		await expect(result1[2].payload === `${pageKey}17`).toBeTruthy();
		await expect(result1[3].payload === `${pageKey}18`).toBeTruthy();
		await expect(result1[4].payload === `${pageKey}19`).toBeTruthy();
		await expect(result1[5].payload === `${pageKey}20`).toBeTruthy();
		await expect(result1[6].payload === `${pageKey}21`).toBeTruthy();
		await expect(result1[7].payload === `${pageKey}22`).toBeTruthy();
		await expect(result1[8].payload === `${pageKey}23`).toBeTruthy();
		await expect(result1[9].payload === `page${pageKey}${alarmePage + 1}`).toBeTruthy();

		alarmePage = -1;
		pageKey = 'tomeiHora';

		let result2 = await duvidas.alarmeHorario(alarmePage, pageKey);
		result2 = result2.quick_replies;

		result1.forEach((e, i) => {
			Object.keys(result1[i]).forEach((key) => {
				expect(result1[i][key] === result2[i][key]).toBeTruthy();
			});
		});
	});
});


describe('alarmeMinuto', async () => {
	it('0 horas', async () => {
		const context = cont.quickReplyContext('alarmeMinuto', 'alarmeMinuto');
		context.state.alarmeHora = 0;

		let result = await duvidas.alarmeMinuto(context.state.alarmeHora);
		result = result.quick_replies;
		await expect(result.length === 6).toBeTruthy();

		await expect(result[0].title === `As ${context.state.alarmeHora}:00`).toBeTruthy();
		await expect(result[1].title === `As ${context.state.alarmeHora}:10`).toBeTruthy();
		await expect(result[2].title === `As ${context.state.alarmeHora}:20`).toBeTruthy();
		await expect(result[3].title === `As ${context.state.alarmeHora}:30`).toBeTruthy();
		await expect(result[4].title === `As ${context.state.alarmeHora}:40`).toBeTruthy();
		await expect(result[5].title === `As ${context.state.alarmeHora}:50`).toBeTruthy();

		await expect(result[0].payload === 'alarmeFinal00').toBeTruthy();
		await expect(result[1].payload === 'alarmeFinal10').toBeTruthy();
		await expect(result[2].payload === 'alarmeFinal20').toBeTruthy();
		await expect(result[3].payload === 'alarmeFinal30').toBeTruthy();
		await expect(result[4].payload === 'alarmeFinal40').toBeTruthy();
		await expect(result[5].payload === 'alarmeFinal50').toBeTruthy();
	});

	it('12 horas', async () => {
		const context = cont.quickReplyContext('alarmeMinuto', 'alarmeMinuto');
		context.state.alarmeHora = '12';

		let result = await duvidas.alarmeMinuto(context.state.alarmeHora);
		result = result.quick_replies;
		await expect(result.length === 6).toBeTruthy();

		await expect(result[0].title === `As ${context.state.alarmeHora}:00`).toBeTruthy();
		await expect(result[1].title === `As ${context.state.alarmeHora}:10`).toBeTruthy();
		await expect(result[2].title === `As ${context.state.alarmeHora}:20`).toBeTruthy();
		await expect(result[3].title === `As ${context.state.alarmeHora}:30`).toBeTruthy();
		await expect(result[4].title === `As ${context.state.alarmeHora}:40`).toBeTruthy();
		await expect(result[5].title === `As ${context.state.alarmeHora}:50`).toBeTruthy();

		await expect(result[0].payload === 'alarmeFinal00').toBeTruthy();
		await expect(result[1].payload === 'alarmeFinal10').toBeTruthy();
		await expect(result[2].payload === 'alarmeFinal20').toBeTruthy();
		await expect(result[3].payload === 'alarmeFinal30').toBeTruthy();
		await expect(result[4].payload === 'alarmeFinal40').toBeTruthy();
		await expect(result[5].payload === 'alarmeFinal50').toBeTruthy();
	});
});

describe('buildChoiceTimeStamp', async () => {
	it('replace hour and minute', async () => {
		const hour = 8;
		const minute = 15;
		const now = new Date();

		const result = await duvidas.buildChoiceTimeStamp(hour, minute);
		await expect(result).toBeTruthy();
		await expect(now.getDay() === result.getDay()).toBeTruthy();
		await expect(now.getHours() !== result.getHours()).toBeTruthy();
		await expect(now.getMinutes() !== result.getMinutes()).toBeTruthy();
		await expect(result.getHours() === hour).toBeTruthy();
		await expect(result.getMinutes() === minute).toBeTruthy();
		await expect(result.getSeconds() === 0).toBeTruthy();
		await expect(result.getMilliseconds() === 0).toBeTruthy();
	});
});
