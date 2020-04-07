const cont = require('./context');
const duvidas = require('../app/utils/duvidas');
const flow = require('../app/utils/flow');
const help = require('../app/utils/helper');
const { sendMain } = require('../app/utils/mainMenu');
const { falarComHumano } = require('../app/utils/mainMenu');
const { getQR } = require('../app/utils/attach');

jest.mock('../app/utils/mainMenu');
jest.mock('../app/utils/attach');

// describe('prepDuvidaFollowUp - Dúvidas para PrER seguimento', async () => {
// 	it('SUS - MG', async () => {
// 		const context = cont.quickReplyContext('duvidasPrep', 'duvidasPrep');
// 		context.state.user.voucher_type = 'sus';
// 		context.state.user.city = '1';
// 		await duvidas.prepDuvidaFollowUp(context);

// 		await expect(context.sendText).toBeCalledWith(flow.duvidasPrep.prefixSUS + flow.duvidasPrep.textosSUS[context.state.user.city]);
// 		await expect(sendMain).toBeCalledWith(context);
// 	});

// 	it('SUS - BA', async () => {
// 		const context = cont.quickReplyContext('duvidasPrep', 'duvidasPrep');
// 		context.state.user.voucher_type = 'sus';
// 		context.state.user.city = 2;
// 		await duvidas.prepDuvidaFollowUp(context);

// 		await expect(context.sendText).toBeCalledWith(flow.duvidasPrep.prefixSUS + flow.duvidasPrep.textosSUS[context.state.user.city]);
// 		await expect(sendMain).toBeCalledWith(context);
// 	});

// 	it('SUS - SP', async () => {
// 		const context = cont.quickReplyContext('duvidasPrep', 'duvidasPrep');
// 		context.state.user.voucher_type = 'sus';
// 		context.state.user.city = 2;
// 		await duvidas.prepDuvidaFollowUp(context);

// 		await expect(context.sendText).toBeCalledWith(flow.duvidasPrep.prefixSUS + flow.duvidasPrep.textosSUS[context.state.user.city]);
// 		await expect(sendMain).toBeCalledWith(context);
// 	});

// 	it('SUS - No city', async () => {
// 		const context = cont.quickReplyContext('duvidasPrep', 'duvidasPrep');
// 		context.state.user.voucher_type = 'sus';
// 		context.state.user.city = 10;
// 		await duvidas.prepDuvidaFollowUp(context);

// 		await expect(context.sendText).toBeCalledWith(flow.duvidasPrep.prefixSUS + flow.duvidasPrep.demaisLocalidades);
// 		await expect(sendMain).toBeCalledWith(context);
// 	});

// 	it('Not SUS - No city', async () => {
// 		const context = cont.quickReplyContext('duvidasPrep', 'duvidasPrep');
// 		context.state.user.voucher_type = 'combina';

// 		await duvidas.prepDuvidaFollowUp(context);
// 		await expect(falarComHumano).toBeCalledWith(context, null, flow.duvidasPrep.notSUS);
// 	});
// });

describe('prepDuvidaFollowUp', async () => {
	it('sisprep - goes to falar com humanos', async () => {
		const context = cont.quickReplyContext('prepDuvidaFollowUp', 'prepDuvidaFollowUp');
		context.state.user.voucher_type = 'sisprep';
		await duvidas.prepDuvidaFollowUp(context);

		await expect(falarComHumano).toBeCalledWith(context, null, flow.duvidasPrep.followUpSisPrep);
	});

	it('combina - sees msg and goes to menu', async () => {
		const context = cont.quickReplyContext('prepDuvidaFollowUp', 'prepDuvidaFollowUp');
		context.state.user.voucher_type = 'combina';
		await duvidas.prepDuvidaFollowUp(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasPrep.followUpCombina);
		await expect(sendMain).toBeCalledWith(context);
	});

	it('sus - sees msg and goes to menu', async () => {
		const context = cont.quickReplyContext('prepDuvidaFollowUp', 'prepDuvidaFollowUp');
		context.state.user.voucher_type = 'sus';
		await duvidas.prepDuvidaFollowUp(context);

		await expect(context.sendText).toBeCalledWith(flow.duvidasPrep.followUpSUS);
		await expect(sendMain).toBeCalledWith(context);
	});

	it('other voucher - goes to menu', async () => {
		const context = cont.quickReplyContext('prepDuvidaFollowUp', 'prepDuvidaFollowUp');
		context.state.user.voucher_type = 'foobar';
		await duvidas.prepDuvidaFollowUp(context);

		await expect(sendMain).toBeCalledWith(context);
	});
});

describe('alarmeConfigurar', async () => {
	it('combina - faz pergunta como está tomando', async () => {
		const context = cont.quickReplyContext('alarmeConfigurar', 'alarmeConfigurar');
		context.state.user.voucher_type = 'combina';

		await duvidas.alarmeConfigurar(context);
		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.comoTomando, await getQR(flow.alarmePrep.comoTomandoBtn));
	});

	it('não é combina - faz pergunta como ajudo você', async () => {
		const context = cont.quickReplyContext('alarmeConfigurar', 'alarmeConfigurar');
		context.state.user.voucher_type = 'foobar';

		await duvidas.alarmeConfigurar(context);
		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.comoAjudo, await getQR(flow.alarmePrep.comoAjudoBtn));
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
		const offset = now.getTimezoneOffset() / 60;

		const result = await duvidas.buildChoiceTimeStamp(hour, minute);
		const { date } = result;


		await expect(date).toBeTruthy();
		await expect(now.getDay() === date.getDay()).toBeTruthy();
		await expect(now.getHours() !== date.getHours()).toBeTruthy();
		await expect(now.getMinutes() !== date.getMinutes() || date.getMinutes() === 15).toBeTruthy();
		await expect(date.getHours() === hour - offset).toBeTruthy();
		await expect(date.getMinutes() === minute).toBeTruthy();
		await expect(date.getSeconds() === 0).toBeTruthy();
		await expect(date.getMilliseconds() === 0).toBeTruthy();
	});
});


describe('formatDate', async () => {
	it('Empty - false', async () => {
		const res = await duvidas.formatDate();
		await expect(res).toBeFalsy();
	});

	it('text - false', async () => {
		const res = await duvidas.formatDate('foobar');
		await expect(res).toBeFalsy();
	});

	it('number - false', async () => {
		const res = await duvidas.formatDate(123456);
		await expect(res).toBeFalsy();
	});

	it('MM/DD/YYYY - false', async () => {
		const res = await duvidas.formatDate('12/30/2020');
		await expect(res).toBeFalsy();
	});

	it('DD-MM-YYYY - false', async () => {
		const res = await duvidas.formatDate('30-12-2020');
		await expect(res).toBeFalsy();
	});

	it('DD/MM/YYYY - true', async () => {
		const res = await duvidas.formatDate('30/12/2020');
		await expect(res).toBeTruthy();
	});
});


describe('checkDate', async () => {
	it('data after today - string', async () => {
		const data = new Date();
		data.setDate(data.getDate() + 1);

		const res = await duvidas.checkDate(data);
		await expect(typeof res).toBe('string');
	});

	it('data before 6 months - string', async () => {
		const data = new Date();
		data.setMonth(data.getMonth() - 7);

		const res = await duvidas.checkDate(data);
		await expect(typeof res).toBe('string');
	});

	it('data within 6 months, within 15 days - boolean', async () => {
		const data = new Date();
		data.setDate(data.getDate() - 5);

		const res = await duvidas.checkDate(data);
		await expect(typeof res).toBe('boolean');
	});

	it('data within 6 months, before 15 days - date', async () => {
		const data = new Date();
		data.setDate(data.getDate() - 20);

		const res = await duvidas.checkDate(data);
		await expect(typeof res).toBe('object');
	});
});

describe('alarmeDate', async () => {
	it('formato inválido - tenta de novo', async () => {
		const context = await cont.textContext('foobar', 'alarmeAcabar');
		const date = await duvidas.alarmeDate(context);

		await expect(date).toBeFalsy();
		await expect(context.sendText).toBeCalledWith(`${flow.alarmePrep.alarmeAcabar.invalid} ${date || ''}`);
		await expect(context.setState).toBeCalledWith({ dialog: 'alarmeAcabar' });
	});

	it('formato válido mas valor inválido - vê erro e tenta de novo', async () => {
		const data = new Date();
		data.setDate(data.getDate() + 1);
		const dataString = await help.moment(data).format('DD/MM/YYYY');
		const context = await cont.textContext(dataString, 'alarmeAcabar');

		const date = await duvidas.alarmeDate(context);

		await expect(typeof date).toBe('string');
		await expect(context.sendText).toBeCalledWith(`${flow.alarmePrep.alarmeAcabar.invalid} ${date || ''}`);
		await expect(context.setState).toBeCalledWith({ dialog: 'alarmeAcabar' });
	});

	it('formato válido e valor válido, mas foi a menos de 15 dias - pede para confirmar', async () => {
		const data = new Date();
		const dataString = await help.moment(data).format('DD/MM/YYYY');
		const context = await cont.textContext(dataString, 'alarmeAcabar');

		const date = await duvidas.alarmeDate(context);

		await expect(typeof date).toBe('boolean');
		await expect(context.setState).toBeCalledWith({ dialog: 'alarmeConfirmaData' });
	});

	it('formato válido, valor válido e passaram mais de 15 dias - salva data e vê opções de frascos', async () => {
		const data = new Date();
		data.setDate(data.getDate() - 20);
		const dataString = await help.moment(data).format('DD/MM/YYYY');
		const context = await cont.textContext(dataString, 'alarmeAcabar');

		const date = await duvidas.alarmeDate(context);

		await expect(typeof date).toBe('object');
		await expect(context.setState).toBeCalledWith({ dialog: 'alarmeAcabarFrascos', dataUltimaConsulta: date });
	});
});


describe('autotesteServico', async () => {
	it('combina - vê msg e vai para menu', async () => {
		const context = await cont.textContext('autoServico', 'autoServico');
		context.state.user = { voucher_type: 'combina' };

		await duvidas.autotesteServico(context);

		await expect(context.sendText).toBeCalledWith(flow.autoteste.autoServicoCombina);
		await expect(sendMain).toBeCalledWith(context);
	});

	it('sisprep e SP - oferece duas opções de local', async () => {
		const context = await cont.textContext('autoServico', 'autoServico');
		context.state.user = { voucher_type: 'sisprep', city: '3' };

		await duvidas.autotesteServico(context);

		await expect(context.sendText).toBeCalledWith(flow.autoteste.autoServicoSisprepSP, await getQR(flow.autoteste.autoServicoSisprepSPBtn));
	});

	it('sus e não-SP - mostra os dados, encerra e vai pro menu', async () => {
		const context = await cont.textContext('autoServico', 'autoServico');
		context.state.user = { voucher_type: 'sus', city: '1' };
		context.state.autotesteServicoMsg = 'foobar';

		await duvidas.autotesteServico(context);
		await expect(context.setState).toBeCalledWith({ autotesteServicoMsg: await duvidas.buildServicoInfo(context.state.user.city) }); // from sendAutoServicoMsg
		await expect(context.sendText).toBeCalledWith(context.state.autotesteServicoMsg);
		await expect(context.sendText).toBeCalledWith(flow.autoteste.autoServicoEnd);
		await expect(sendMain).toBeCalledWith(context);
	});
});

describe('sendAutotesteMsg', async () => {
	it('envia intro, mensagem customizada e outra mensagem com botões', async () => {
		const context = await cont.textContext('autoServico', 'autoServico');
		context.state.user = { city: '1' };
		context.state.testagem = { msg: 'foobar', opt: [{}] };

		await duvidas.sendAutotesteMsg(context);
		await expect(context.setState).toBeCalledWith({ testagem: await duvidas.buildTestagem(context.state.user.city) });
		await expect(context.state.testagem && context.state.testagem.msg && context.state.testagem.opt).toBeTruthy();
		await expect(context.sendText).toBeCalledWith(flow.testagem.text1);
		await expect(context.sendText).toBeCalledWith(context.state.testagem.msg);
		await expect(context.sendText).toBeCalledWith(flow.testagem.text2, context.state.testagem.opt);
	});
});


describe('buildTestagem', async () => {
	const rules = {
		1: ['autoteste', 'serviço', 'ong'],
		2: ['ong', 'serviço'],
		3: ['ong'],
	};

	it('All options - all texts and 3 options', async () => {
		const res = await duvidas.buildTestagem(1, rules[1]);

		await expect(res && res.msg && res.opt && res.opt.quick_replies).toBeTruthy();
		await expect(res.opt.quick_replies.length).toBe(3);
		await expect(res.msg.includes(flow.testagem.types.autoteste.msg)).toBeTruthy();
		await expect(res.msg.includes(flow.testagem.types.serviço.msg)).toBeTruthy();
		await expect(res.msg.includes(flow.testagem.types.ong.msg)).toBeTruthy();
	});

	it('two options - 2 texts and 2 options', async () => {
		const res = await duvidas.buildTestagem(2, rules[2]);

		await expect(res && res.msg && res.opt && res.opt.quick_replies).toBeTruthy();
		await expect(res.opt.quick_replies.length).toBe(2);
		await expect(res.msg.includes(flow.testagem.types.autoteste.msg)).toBeFalsy();
		await expect(res.msg.includes(flow.testagem.types.serviço.msg)).toBeTruthy();
		await expect(res.msg.includes(flow.testagem.types.ong.msg)).toBeTruthy();
	});

	it('one option - 1 text and 1 option', async () => {
		const res = await duvidas.buildTestagem(3, rules[3]);

		await expect(res && res.msg && res.opt && res.opt.quick_replies).toBeTruthy();
		await expect(res.opt.quick_replies.length).toBe(1);
		await expect(res.msg.includes(flow.testagem.types.autoteste.msg)).toBeFalsy();
		await expect(res.msg.includes(flow.testagem.types.serviço.msg)).toBeFalsy();
		await expect(res.msg.includes(flow.testagem.types.ong.msg)).toBeTruthy();
	});
});

describe('sendAlarmeIntro', async () => {
	const btn = {};
	it('Tem alarme - vê uma mensagem e botões', async () => {
		const context = await cont.quickReplyContext('sendAlarmeIntro', 'sendAlarmeIntro');
		context.state.user = { has_alarm: true };

		await duvidas.sendAlarmeIntro(context, btn);
		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.hasAlarm, btn);
	});

	it('Não tem alarme - vê outra mensagem e botões', async () => {
		const context = await cont.quickReplyContext('sendAlarmeIntro', 'sendAlarmeIntro');
		context.state.user = { has_alarm: false };

		await duvidas.sendAlarmeIntro(context, btn);
		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.noAlarm, btn);
	});
});

describe('alarmeSemMedicacao', async () => {
	it('É Combina - vê duas msgs e vai pro menu', async () => {
		const context = await cont.quickReplyContext('alarmeSemMedicacao', 'alarmeSemMedicacao');
		context.state.user = { voucher_type: 'combina' };

		await duvidas.alarmeSemMedicacao(context);
		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeSemMedicacao);
		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeSemMedicacaoExtra);
		await expect(sendMain).toBeCalledWith(context);
	});

	it('Não é Combina - Vê msg e vai pro menu', async () => {
		const context = await cont.quickReplyContext('alarmeSemMedicacao', 'alarmeSemMedicacao');
		context.state.user = { voucher_type: 'sisprep' };

		await duvidas.alarmeSemMedicacao(context);
		await expect(context.sendText).toBeCalledWith(flow.alarmePrep.alarmeSemMedicacao);
		await expect(context.sendText).not.toBeCalledWith(flow.alarmePrep.alarmeSemMedicacaoExtra);
		await expect(sendMain).toBeCalledWith(context);
	});
});