import application from './application';

const PORT: any = process.env.PORT || 3000;
const fastify = application();

const start = async () => {
    try {
        await fastify.listen(PORT, '0.0.0.0');
        console.log("server is running in port " + PORT);
    } catch (error) {
        fastify.log.error(error);
        process.exit(1);
    }
}
start();