const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DetectedIP = sequelize.define('DetectedIP', {
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
    firstDetected: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    lastSeen: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    status: {
        type: DataTypes.ENUM('detected', 'blocked', 'ignored'),
        defaultValue: 'detected'
    },
    blockedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    country: {
        type: DataTypes.STRING,
        allowNull: true
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true
    },
    threatLevel: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'detected_ips',
    timestamps: true,
    indexes: [
        { fields: ['ip'] },
        { fields: ['status'] },
        { fields: ['firstDetected'] }
    ]
});

module.exports = DetectedIP;