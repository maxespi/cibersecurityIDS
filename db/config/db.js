const { Sequelize } = require('sequelize');
const { DATABASE } = require('../../src/config/constants');

const sequelize = new Sequelize({
    dialect: DATABASE.DIALECT,
    storage: DATABASE.STORAGE,
    logging: DATABASE.LOGGING,
    pool: DATABASE.POOL,
    define: {
        timestamps: true,
        underscored: false,
        freezeTableName: true
    }
});

module.exports = sequelize;