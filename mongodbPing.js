// MongoDB Atlas Connection Check
// =================================
// Este script verifica a conectividade com o MongoDB Atlas usando o driver oficial do Node.js.
// Ele lê a URI de conexão do ambiente ou de um arquivo de configuração, faz um ping simples
// e exibe mensagens claras sobre o status da conexão.

// Passo 1: Importar o MongoDB Driver
// O driver oficial do MongoDB para Node.js permite conectar e interagir com bancos MongoDB.
// Instale com: npm install mongodb
const { MongoClient } = require('mongodb');

// Passo 2: Configurar a URI de conexão
// A URI contém as credenciais e endpoint do cluster MongoDB Atlas.
// Formato: mongodb+srv://<usuario>:<senha>@<cluster-url>/<database>?retryWrites=true&w=majority
// IMPORTANTE: Nunca hardcode credenciais reais em código. Use variáveis de ambiente.
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://<usuario>:<senha>@<cluster-url>/test?retryWrites=true&w=majority';

// Passo 3: Criar o cliente MongoDB
// O cliente gerencia a conexão com o cluster. O useUnifiedTopology garante compatibilidade.
const client = new MongoClient(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Função principal que executa o check de conexão
async function checkMongoDBConnection() {
  console.log('🚀 Iniciando verificação de conexão com MongoDB Atlas...');
  console.log('📍 URI Configurada:', MONGODB_URI.replace(/\/\/[^@]+@/, '//***:***@')); // Oculta credenciais

  try {
    // Passo 4: Tentar conectar ao MongoDB
    console.log('🔄 Tentando conectar ao cluster...');
    await client.connect();
    console.log('✅ Conexão estabelecida com sucesso!');

    // Passo 5: Executar o comando ping (leve e rápido)
    console.log('🏓 Enviando ping ao cluster...');
    const pingResult = await client.db('admin').command({ ping: 1 });
    console.log('✅ Ping bem-sucedido! Resposta:', JSON.stringify(pingResult));

    // Passo 6: Verificar se o ping retornou OK (1)
    if (pingResult.ok === 1) {
      console.log('🎉 Status: Conexão MongoDB Atlas está funcionando corretamente!');
    } else {
      console.warn('⚠️  Ping retornou status não esperado:', pingResult);
    }

  } catch (error) {
    // Passo 7: Tratar erros de conexão ou ping
    console.error('❌ Erro na conexão com MongoDB Atlas:');
    console.error('   Tipo:', error.name);
    console.error('   Mensagem:', error.message);

    if (error.message.includes('authentication')) {
      console.error('   💡 Verifique seu usuário e senha na URI');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      console.error('   💡 Verifique se o cluster está rodando e a URI está correta');
    } else if (error.message.includes('SSL')) {
      console.error('   💡 Verifique se há problemas de certificado SSL');
    }

  } finally {
    // Passo 8: Sempre fechar a conexão, mesmo em caso de erro
    console.log('🔌 Fechando conexão...');
    await client.close();
    console.log('✅ Verificação concluída!');
  }
}

// Executar a função principal
checkMongoDBConnection();

// =================================
// COMO USAR:
// =================================
// 1. Instalar o driver: npm install mongodb
// 2. Configurar a variável de ambiente:
//    export MONGODB_URI="mongodb+srv://usuario:senha@cluster.mongodb.net/?retryWrites=true&w=majority"
// 3. Executar: node mongodbPing.js
// =================================