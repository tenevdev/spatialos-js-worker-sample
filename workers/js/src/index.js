const sdk = require("spatialos_worker_sdk");
const {EntityAclData} = require("./generated/improbable/EntityAclData");
const {EntityAcl} = require("./generated/improbable/EntityAcl");
const {WorkerAttributeSet} = require("./generated/improbable/WorkerAttributeSet");
const {WorkerRequirementSet} = require("./generated/improbable/WorkerRequirementSet");
const {Coordinates} = require("./generated/improbable/Coordinates");
const {Position} = require("./generated/improbable/Position");
const {PositionData} = require("./generated/improbable/PositionData");
const {Persistence} = require("./generated/improbable/Persistence");
const {PersistenceData} = require("./generated/improbable/PersistenceData");

let locatorParameters = new sdk.LocatorParameters();
locatorParameters.projectName = "my_project";
locatorParameters.credentialsType = sdk.LocatorCredentialsType.LOGIN_TOKEN;
locatorParameters.loginToken = {
  token: sdk.DefaultConfiguration.LOCAL_DEVELOPMENT_LOGIN_TOKEN
};


let workerType = "WebClient";
const connectionParameters = new sdk.ConnectionParameters();
connectionParameters.workerType = workerType;

var entityCount = 0;
let requestIds = {};

function createWorkerAttributeSet(attributes) {
  let workerAttributeSet = new WorkerAttributeSet();
  workerAttributeSet.attribute = attributes;
  return workerAttributeSet;
}

const locator = sdk.Locator.create(sdk.DefaultConfiguration.LOCAL_DEVELOPMENT_LOCATOR_URL, locatorParameters);
locator.getDeploymentList((err, deploymentList) => {
  locator.connect("my_deployment", connectionParameters, (err, queueStatus) => {
      return true;
    },
    (err, connection) => {
      if (err) {
        console.log("Error when connecting", err);
        return;
      }
      connection.sendLogMessage(sdk.LogLevel.WARN, workerType, "Hello from JavaScript!");


      let dispatcher = sdk.Dispatcher.create();
      dispatcher.onDisconnect(op => {
        console.log("---> Disconnected", op);
      });
      connection.attachDispatcher(dispatcher);

      let timeoutMillis = 500;

      // Reserve an entity ID.
      let entityIdReservationRequestId = connection.sendReserveEntityIdRequest(timeoutMillis);

      // When the reservation succeeds, create an entity with the reserved ID.
      dispatcher.onReserveEntityIdResponse(op => {
        if (op.requestId.id === entityIdReservationRequestId.id && op.statusCode === sdk.StatusCode.SUCCESS) {
          let entity = new sdk.Entity();

          // Empty ACL
          let clientAttributeSet = createWorkerAttributeSet(["client"]);

          let entityAcl = new EntityAclData();
          entityAcl.readAcl = new WorkerRequirementSet();
          entityAcl.readAcl.attributeSet = [clientAttributeSet];
          
          entityAcl.componentWriteAcl = new Map();
          entityAcl.componentWriteAcl.set(Position.COMPONENT_ID, entityAcl.readAcl);
          
          entity.add(EntityAcl.COMPONENT, entityAcl);

          // Needed for the entity to be persisted in snapshots.
          entity.add(Persistence.COMPONENT, new PersistenceData());

          let position = new PositionData();
          position.coords = new Coordinates();
          position.coords.x = 0;
          position.coords.y = 0;
          position.coords.z = 0;
          entity.add(Position.COMPONENT, position);

          requestIds.entityCreationRequest = connection.sendCreateEntityRequest(entity, op.entityId, timeoutMillis);
        }
      });

      dispatcher.onAddEntity(op => {
        entityCount += 1;
        console.log(entityCount);
      });

      // When the creation succeeds, delete the entity.
      dispatcher.onCreateEntityResponse(op => {
        if (op.requestId.id === requestIds.entityCreationRequest.id && op.statusCode === sdk.StatusCode.SUCCESS) {
          console.log("Entity created")  
        }
      });
    });
});


document.addEventListener("DOMContentLoaded", function (event) {
  // Code which depends on the HTML DOM content.
  console.log("Hello World!");
});