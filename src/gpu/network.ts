import { GPULayer } from "./layer.ts";
import { DataSet, InputConfig, LayerConfig, Network, NetworkConfig } from "../types.ts";
import { DataArray, DataType, WebGPUBackend } from "../../deps.ts";
import { fromType, getType } from "../util.ts";
import { GPUMatrix } from "./matrix.ts";

export class GPUNetwork<T extends DataType = DataType> implements Network {
    public input?: InputConfig;
    public hidden: GPULayer[];
    public backend: WebGPUBackend;

    constructor(config: NetworkConfig, backend: WebGPUBackend) {
        this.input = config.input
        this.backend = backend
        this.hidden = config.hidden.map(layer => new GPULayer(layer, backend))
    }

    public addLayers(layers: LayerConfig[]) {
        this.hidden.push(...layers.map(layer => new GPULayer(layer, this.backend)))
    }

    public async initialize(type: DataType, inputSize: number, batches: number){
        await this.hidden[0].initialize(type, inputSize, batches);

        for (let i = 1; i < this.hidden.length; i++) {
            const current = this.hidden[i];
            const previous = this.hidden[i - 1];
            await current.initialize(type, previous.outputSize, batches);
        }
    }

    public async feedForward(input: GPUMatrix) {
        for (const layer of this.hidden) {
            input = await layer.feedForward(input);
        }
        return input;
    }

    public backpropagate() {
    }

    public async train(datasets: DataSet[], epochs: number, batches: number) {
        const type = this.input?.type || getType(datasets[0].inputs as DataArray<T>)
        const inputSize = this.input?.size || datasets[0].inputs.length / batches;
        
        const inputArray = new (fromType(type))(datasets[0].inputs)
        const outputArray = new (fromType(type))(datasets[0].outputs) as DataArray<T>
        const input = await GPUMatrix.from(this.backend, inputArray, inputSize, batches, type)

        for (let e = 0; e < epochs; e++) {
            await this.initialize(type, inputSize, batches);
            
            await this.feedForward(input);

            // TODO loss function?

            this.backpropagate();
        }
    }

    public getOutput(): DataArray<T> {
        throw new Error("Unimplemented!")
    }

    public predict(data: DataArray<T>): DataArray<T> {
        throw new Error("Unimplemented!")
    }
}
