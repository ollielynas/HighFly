import matplotlib.pyplot as plt
import numpy as np

with open('data.txt') as f:
    data = [list(map(float, x.split(" "))) for x in f.read().split("\n") if x != ""]

data = [[data[i][j] for i in range(len(data))] for j in range(4)]
data[0] = [(data[1][i] * data[1][i] + data[2][i] * data[2][i] + data[3][i] * data[3][i]) ** 0.5 for i in range(len(data[0]))]

data = np.array(data)

kernel_size = 8
kernel = np.ones(kernel_size) / kernel_size

data_convolved = np.array([np.convolve(d, kernel, mode='same') for d in data])

print(data_convolved)

for d in data_convolved[1:2]:
    plt.plot(d)


plt.show()