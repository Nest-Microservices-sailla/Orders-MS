import 'dotenv/config'
import * as joi from 'joi'

interface EnvVars {
    PORT: number
    NODE_ENV: string
    PRODUCTS_MICROSERVICE_PORT: number
    PRODUCTS_MICROSERVICE_HOST: string
}

// Validar mediante esquema
const envsSchema = joi.object({
    PORT: joi.number().required(),
    NODE_ENV: joi.string().required(),
    PRODUCTS_MICROSERVICE_PORT: joi.number().required(),
    PRODUCTS_MICROSERVICE_HOST: joi.string().required(),
})
.unknown(true)

const { error, value} = envsSchema.validate(process.env)
if (error) {
    throw new Error(`Config validation error: ${error.message}`)
}

const envVars: EnvVars = value

export const envs = {
    port: envVars.PORT,
    node_env: envVars.NODE_ENV,
    products_microservice_port: envVars.PRODUCTS_MICROSERVICE_PORT,
    products_microservice_host: envVars.PRODUCTS_MICROSERVICE_HOST
}
