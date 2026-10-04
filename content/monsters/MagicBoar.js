/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var MagicBoar = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

MagicBoar.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: MagicBoar
});

MagicBoar.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.setMovementSpeed(6.5);
    
    this.poisonPotency = 150;

    this.isMagic = true;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        if(othis.monster.trackingTarget && othis.isMagic) {
            var targetMonster = othis.monster.trackingTarget.getComponent("Monster");
            if(targetMonster) {
                targetMonster.addStatusEffect(StatusEffects.Effects.Poison, 4, {sourceEntity: othis.gameObject.entity, tickDmg: othis.monster.potencyDamage(othis.poisonPotency)});
            }
        }
    });

    this.gameObject.addEventListener("PacifyMagic", function() {
        othis.isMagic = false;
    });
}


module.exports = MagicBoar;
