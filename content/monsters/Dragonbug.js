/* @flow */
var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var Dragonbug = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

Dragonbug.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: Dragonbug
});

Dragonbug.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");

    this.timeSinceBreath = 0;
    this.breathEveryAttacks = 3;

    this.breathSize = new Vector3(3, 4, 6);
    this.breathForwardOffset = 1.4; //how far forward to shift the breath from the center of the monster to the front.
    this.breathCastTime = 2.0;
    this.breathPotency = 800;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.timeSinceBreath += 1;

        if(othis.timeSinceBreath > othis.breathEveryAttacks) {
            if(args.takeOpportunity()) {
                othis.breathAttack(args.finishOpportunity);
                othis.timeSinceBreath = 0;
            }
        }
    });
}

// Dragonbug.prototype.breathAttack = function(finishCallback) {
//     var othis = this;
//     //Center point is where I am, +1 + 1/2 size * forward vector
//     var breathCenter = this.gameObject.forward().multiplyScalar(this.breathForwardOffset + this.breathSize.z * 0.5).add(this.gameObject.transform.position);
//     breathCenter.y += this.breathSize.y * 0.5 - 1.0;
//     //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
//     this.monster.dangerZone("directional", "box", breathCenter, this.breathSize, this.breathCastTime, 1, function(objectsHit) {
//         _.each(objectsHit, function(anobj) {
//             othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
//         });
//         setTimeout(function() {
//             finishCallback();
//         }, 1000); //give time for breath attack to finish.
        
//     });
// };

Dragonbug.prototype.breathAttack = function(finishCallback) {
    var othis = this;
    //Center point is where I am, +1 + 1/2 size * forward vector
    var breathCenter = this.gameObject.forward().multiplyScalar(this.breathForwardOffset).add(this.gameObject.transform.position);
    breathCenter.y += this.breathSize.y * 0.5 - 1.0;
    //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
    this.monster.slingProjectile(breathCenter, this.gameObject.forward(), this.breathSize, this.breathCastTime, 1, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            othis.monster.dealAoeDamage(anobj, {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
        });
        setTimeout(function() {
            finishCallback();
        }, 1000); //give time for breath attack to finish.
        
    });
};

module.exports = Dragonbug;