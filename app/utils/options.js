module.exports = {
	greetings: {
		quick_replies: [
			{ content_type: 'text', title: 'Quiz', payload: 'beginQuiz' },
			{ content_type: 'text', title: 'Marcar Consulta', payload: 'getCity' },
			{ content_type: 'text', title: 'Ver Consulta', payload: 'verConsulta' },
		],
	},
	verConsulta: {
		quick_replies: [
			{ content_type: 'text', title: 'Ver Consulta', payload: 'verConsulta' },
		],
	},
	asksDesafio: {
		quick_replies: [
			{ content_type: 'text', title: 'Desafio Aceito!', payload: 'desafioAceito' },
			{ content_type: 'text', title: 'Agora não', payload: 'desafioRecusado' },
		],
	},
	desafioAceito: {
		quick_replies: [
			{ content_type: 'text', title: 'Começar!', payload: 'beginQuiz' },
			{ content_type: 'text', title: 'Agora não', payload: 'desafioRecusado' },
		],
	},
	consulta: {
		quick_replies: [
			{ content_type: 'text', title: 'Marcar Consulta', payload: 'getCity' },
			{ content_type: 'text', title: 'Ver Consulta', payload: 'verConsulta' },
		],
	},
	aboutAmandaA: { quick_replies: [{ content_type: 'text', title: 'Entendi', payload: 'desafio' }] },
	aboutAmandaB: { quick_replies: [{ content_type: 'text', title: 'Entendi', payload: 'mainMenu' }] },
	mainMenu: {
		quick_replies: [
			{ content_type: 'text', title: 'Prevenções', payload: 'prevencao' },
			{ content_type: 'text', title: 'Bater Papo', payload: 'baterPapo' },
			{ content_type: 'text', title: 'CTA', payload: 'cta' },
			{ content_type: 'text', title: 'Sobre Amanda Selfie', payload: 'aboutAmandaB' },
		],
	},
	desafio: {
		quick_replies: [
			{ content_type: 'text', title: 'Desafio Aceito', payload: 'desafioAceito' },
			{ content_type: 'text', title: 'Agora não', payload: 'mainMenu' },
		],
	},
	saidNo: {
		quick_replies: [
			{ content_type: 'text', title: 'Ver métodos', payload: 'seePreventions' },
		],
	},
	saidYes: {
		quick_replies: [
			{ content_type: 'text', title: 'Marcar Consulta', payload: 'getCity' },
			{ content_type: 'text', title: 'Ver Consulta', payload: 'verConsulta' }],
	},
	prevention: {
		quick_replies: [
			{ content_type: 'text', title: 'Entendi', payload: 'preventionEnd' },
		],
	},
	consultaFail: {
		quick_replies: [
			{ content_type: 'text', title: 'Tentar de Novo', payload: 'getCity' },
			{ content_type: 'text', title: 'Cancelar', payload: 'mainMenu' },
		],
	},
	answer: {
		sendQuiz: {
			quick_replies: [
				{ content_type: 'text', title: 'Vamos lá', payload: 'beginQuiz' },
				{ content_type: 'text', title: 'Agora não', payload: 'endFlow' },
			],
		},
		sendResearch: {
			quick_replies: [
				{ content_type: 'text', title: 'Tudo bem', payload: 'joinResearch' },
				{ content_type: 'text', title: 'Não', payload: 'endFlow' },
			],
		},
		sendConsulta: {
			quick_replies: [
				{ content_type: 'text', title: 'Marcar Consulta', payload: 'getCity' },
				{ content_type: 'text', title: 'Ver Consulta', payload: 'verConsulta' },
			],
		},
	},

};
