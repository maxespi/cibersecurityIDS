// db/models/BaseModel.js
const { DataTypes } = require('sequelize');
const logger = require('../../src/utils/logger');

/**
 * Clase base para todos los modelos de Sequelize
 * Implementa funcionalidades comunes y estandariza estructura
 */
class BaseModel {
    /**
     * Configuración base común para todos los modelos
     */
    static getBaseConfig() {
        return {
            timestamps: true,
            paranoid: false, // No soft deletes por defecto
            underscored: false,
            freezeTableName: true,
            validate: {},
            hooks: {
                beforeCreate: (instance) => {
                    logger.debug('Creando nueva instancia', {
                        model: instance.constructor.name,
                        id: instance.id
                    });
                },
                afterCreate: (instance) => {
                    logger.info('Instancia creada', {
                        model: instance.constructor.name,
                        id: instance.id
                    });
                },
                beforeUpdate: (instance) => {
                    logger.debug('Actualizando instancia', {
                        model: instance.constructor.name,
                        id: instance.id
                    });
                },
                beforeDestroy: (instance) => {
                    logger.info('Eliminando instancia', {
                        model: instance.constructor.name,
                        id: instance.id
                    });
                }
            }
        };
    }

    /**
     * Campos base que todos los modelos pueden tener
     */
    static getBaseFields() {
        return {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                field: 'created_at'
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                field: 'updated_at'
            }
        };
    }

    /**
     * Validaciones comunes
     */
    static getCommonValidations() {
        return {
            isValidIP: (value) => {
                const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
                if (!ipRegex.test(value)) {
                    throw new Error('IP address format is invalid');
                }
            },
            isNotEmpty: (value) => {
                if (!value || value.trim().length === 0) {
                    throw new Error('Field cannot be empty');
                }
            },
            isValidStatus: (allowedValues) => {
                return (value) => {
                    if (!allowedValues.includes(value)) {
                        throw new Error(`Status must be one of: ${allowedValues.join(', ')}`);
                    }
                };
            }
        };
    }

    /**
     * Métodos de instancia comunes
     */
    static getInstanceMethods() {
        return {
            /**
             * Convierte la instancia a JSON limpio
             */
            toSafeJSON: function() {
                const values = { ...this.dataValues };

                // Remover campos sensibles si existen
                delete values.password;
                delete values.token;
                delete values.secret;

                return values;
            },

            /**
             * Actualiza la instancia con validación
             */
            safeUpdate: async function(data) {
                try {
                    await this.update(data);
                    logger.info('Instancia actualizada exitosamente', {
                        model: this.constructor.name,
                        id: this.id
                    });
                    return this;
                } catch (error) {
                    logger.error('Error actualizando instancia', {
                        model: this.constructor.name,
                        id: this.id,
                        error: error.message
                    });
                    throw error;
                }
            }
        };
    }

    /**
     * Métodos de clase comunes
     */
    static getClassMethods() {
        return {
            /**
             * Busca de forma segura con logging
             */
            safeFindAll: async function(options = {}) {
                try {
                    const results = await this.findAll(options);
                    logger.debug('Consulta ejecutada', {
                        model: this.name,
                        count: results.length,
                        options: JSON.stringify(options)
                    });
                    return results;
                } catch (error) {
                    logger.error('Error en consulta', {
                        model: this.name,
                        error: error.message,
                        options: JSON.stringify(options)
                    });
                    throw error;
                }
            },

            /**
             * Busca por ID de forma segura
             */
            safeFindByPk: async function(id) {
                try {
                    const result = await this.findByPk(id);
                    if (!result) {
                        logger.warn('Registro no encontrado', {
                            model: this.name,
                            id
                        });
                    }
                    return result;
                } catch (error) {
                    logger.error('Error buscando por ID', {
                        model: this.name,
                        id,
                        error: error.message
                    });
                    throw error;
                }
            }
        };
    }

    /**
     * Combina configuraciones base con configuraciones específicas del modelo
     */
    static combineConfig(modelConfig = {}) {
        const baseConfig = this.getBaseConfig();

        return {
            ...baseConfig,
            ...modelConfig,
            hooks: {
                ...baseConfig.hooks,
                ...(modelConfig.hooks || {})
            }
        };
    }
}

module.exports = BaseModel;