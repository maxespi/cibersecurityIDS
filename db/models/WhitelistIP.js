const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const WhitelistIP = sequelize.define('WhitelistIP', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    ip: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isIP: true
        }
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    addedBy: {
        type: DataTypes.STRING,
        allowNull: true
    },
    permanent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'whitelist_ips',
    timestamps: true,
    indexes: [
        { fields: ['ip'] }
    ]
});

module.exports = WhitelistIP;