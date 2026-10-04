var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var Chance = require("orbus").Chance;
var StatusEffects = require("orbus").StatusEffects;

var Cobra = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

Cobra.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: Cobra
});

Cobra.prototype.Start = function() {
    var othis = this;

    this.spitEverySeconds = 6;
    this.timeSinceLastSpit = 100; //do it right away
    this.spitTickPotency = 75;
    this.spitDuration = 6;

    this.monster = this.gameObject.getComponent("Monster");

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.timeSinceLastSpit += args.delta;

        if(!othis.monster.trackingTarget) return;

        if(othis.timeSinceLastSpit > othis.spitEverySeconds) {
            if(args.takeOpportunity()) {
                othis.poisonTarget(othis.monster.trackingTarget);
                othis.timeSinceLastSpit = 0;
                args.finishOpportunity();
            }
        }
    });
}

Cobra.prototype.poisonTarget = function(targetGo) {
    var targetMonster = targetGo.getComponent("Monster");
    if(!targetMonster) {
        console.log("Treid to poison target but had no mosnter attached...");
    }
    this.monster.triggerAnimation("spit");
    targetMonster.addStatusEffect(StatusEffects.Effects.Poison, this.spitDuration, {tickDmg: this.monster.potencyDamage(this.spitTickPotency), sourceEntity: this.gameObject.entity});
}


module.exports = Cobra;