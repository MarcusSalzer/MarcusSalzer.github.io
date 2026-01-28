import json
import time


# Dummy model class
class MyLSTM:
    def __init__(
        self,
        embedding_dim: int,
        hidden_dim: int,
    ) -> None:
        self.name = f"MyLSTM({embedding_dim=}, {hidden_dim=})"


def train_my_model(model, data, epochs: int, lr: float):
    print(f"Training {model.name} | {epochs=} | {lr=}")
    for i in range(epochs):
        time.sleep(0.5)
        print(f"    {i:02d}: ...")


def load_a_bunch_of_data():
    for i in range(20):
        print(f"\rloading data: {(i + 1) / 20:.0%}", end="")
        time.sleep(0.1)
    print("\ndata OK!")

    return [1, 2, 3]


def main_json():
    with open("examples/config_ok.json") as f:
        config = json.load(f)

    model = MyLSTM(**config["model"])


if __name__ == "__main__":
    # Make a model
    model = MyLSTM(16, 64)

    # Load the data
    data = load_a_bunch_of_data()

    # Train the model
    train_my_model(model, data, epochs=5, lr=1e-3)
