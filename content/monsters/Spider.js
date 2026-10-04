var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var Chance = require("orbus").Chance;
var StatusEffects = require("orbus").StatusEffects;

var Spider = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

Spider.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: Spider
});

Spider.prototype.Start = function() {
    var othis = this;

    this.spitEverySeconds = 6;
    this.timeSinceLastSpit = 100; //do it right away
    this.spitTickPotency = 75;
    this.spitDuration = 7;

    this.webEverySeconds = 6;
    this.timeSinceLastWeb = 0;
    this.webSlowPct = 0.25;
    this.webDuration = 13;

    this.monster = this.gameObject.getComponent("Monster");

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.timeSinceLastSpit += args.delta;
        othis.timeSinceLastWeb += args.delta;

        if(!othis.monster.trackingTarget) return;

        if(othis.timeSinceLastSpit > othis.spitEverySeconds) {
            if(args.takeOpportunity()) {
                othis.poisonTarget(othis.monster.trackingTarget);
                othis.timeSinceLastSpit = 0;
                args.finishOpportunity();
            }
        }
        else if(othis.timeSinceLastWeb > othis.webEverySeconds) {
            othis.webTarget(othis.monster.trackingTarget);
            othis.timeSinceLastWeb = 0;
        }
    });
}

Spider.prototype.poisonTarget = function(targetGo) {
    var targetMonster = targetGo.getComponent("Monster");
    if(!targetMonster) {
        console.log("Treid to poison target but had no mosnter attached...");
    }
    this.broadcastToActiveClients(1, ["byte"], [1]); //trigger animation
    targetMonster.addStatusEffect(StatusEffects.Effects.Poison, this.spitDuration, {tickDmg: this.monster.potencyDamage(this.spitTickPotency), sourceEntity: this.gameObject.entity});
}

Spider.prototype.webTarget = function(targetGo) {
    var targetMonster = targetGo.getComponent("Monster");
    if(!targetMonster) {
        console.log("Treid to web target but had no mosnter attached...");
        return;
    }
    //this.broadcastToActiveClients(1, ["byte"], [1]); //trigger animation
    targetMonster.addStatusEffect(StatusEffects.Effects.Web, this.webDuration, {slowPercentage: this.webSlowPct, sourceEntity: this.gameObject.entity});

}


module.exports = Spider;