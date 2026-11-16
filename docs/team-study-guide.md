# NeuroCare AI: Team Study Guide

Everything each of us should be able to explain, in simple words. It follows Lectures 1 to 6 and our project report.

## 1. The project in 30 seconds

Say this if the teacher asks "What is your project?":

> We trained an artificial neural network on a public American health survey called BRFSS 2021. A person gives 21 simple answers, such as age group, BMI and blood pressure. The network gives a score between 0 and 1. If the score is at or above our cutoff, the model says "label 1", which means the person reported having diabetes in the survey. We also built a full website around the model. It is an educational project, not a medical tool.

Three short points to add:

- The network is a **multi-layer perceptron**: 21 inputs, two hidden layers (64 and 32 neurons, ReLU), one output neuron (sigmoid).
- It was trained with **backpropagation**, the **Adam** optimiser and the **binary cross-entropy** loss.
- We stopped overfitting with **L2, dropout and early stopping**.

## 2. Numbers everyone must know

| What | Value |
|---|---|
| Dataset | CDC BRFSS 2021 (a telephone health survey of US adults) |
| Records we used | 222,600 |
| Records with label 1 | 14.7% (the data is imbalanced) |
| Inputs | 21 survey answers |
| Network shape | 21, then 64, then 32, then 1 |
| Trainable parameters | 3,521 |
| Split | Training 141,834 / Validation 40,390 / Test 40,376 |
| Cutoff (threshold) | 0.132, about 13.2% |
| Recall | 82.8% |
| Precision | 29.8% |
| Accuracy | 67.0% |
| ROC AUC | 0.813 |
| Logistic regression ROC AUC | 0.805 |
| "Always say 0" accuracy | 84.5%, with 0% recall |

## 3. How one prediction travels

1. The user fills in 21 answers on the website (or picks an example profile).
2. The browser sends the answers to our server (the API).
3. The server checks every answer. Wrong or missing values are rejected.
4. The answers are **standardised**: for each one, subtract the training mean and divide by the training standard deviation.
5. **Forward propagation**: the 21 numbers go through the 64 neurons, then the 32 neurons, then the one output neuron.
6. The output neuron uses **sigmoid**, so the result is a score between 0 and 1.
7. The score is compared with the cutoff 0.132. At or above it is label 1. Below it is label 0.
8. The result is saved in the database, and only then shown on the page.

No training happens when a user clicks. The model was trained once, before. Using a trained model like this is called **inference**.

## 4. Lecture by lecture: where it is in our project

### Lecture 1: What is an ANN

- **Lecture idea:** an ANN copies the idea of the brain. Neurons are connected by links, and each link has a weight. There is an input layer, hidden layers and an output layer.
- **In our project:** the input layer has 21 values. There are two hidden layers with 64 and 32 neurons. The output layer has 1 neuron. It is fully connected: every neuron is linked to every neuron in the next layer.
- **Learning from examples, not rules:** we never wrote a rule like "if BMI is high then diabetes". The network found the patterns itself from 141,834 training examples.
- **Application area:** healthcare, which is one of the applications named in the lecture.

### Lecture 2: Perceptron, weights, bias, activation functions

- **Each neuron does the lecture formula:** multiply inputs by weights, add them, add the bias, then apply an activation function.
- **Weights** say how important each input is. **Bias** shifts the result, like a base salary.
- **Why not a single perceptron?** One perceptron can only draw one straight line (linearly separable problems), and it gives a hard 0 or 1 with no score. So we use many neurons in layers.
- **Our activation functions:**

| Where | Function | Why |
|---|---|---|
| Hidden layers | ReLU, max(0, x) | Fast, and it helps avoid vanishing gradients |
| Output layer | Sigmoid | It gives a value between 0 and 1, which fits a yes or no problem |

- **Why not softmax?** Softmax is for more than two classes. We have two classes, so one sigmoid neuron is enough.
- **Why not the step function?** It gives only 0 or 1, and its slope is zero, so backpropagation cannot learn with it. We want a score first. Our cutoff of 0.132 then does the job of the step.
- **Without activation functions** the whole network would collapse into one straight-line formula, as the lecture says.

### Lecture 3: Multi-Layer Perceptron and forward propagation

- Our model **is** an MLP. Data flows forward from input to output. That is forward propagation, and it is where prediction happens.
- **How we count the parameters** (a good question to be ready for):

| Layer | Calculation | Parameters |
|---|---|---|
| Hidden 1 | (21 inputs + 1 bias) x 64 | 1,408 |
| Hidden 2 | (64 inputs + 1 bias) x 32 | 2,080 |
| Output | (32 inputs + 1 bias) x 1 | 33 |
| Total | | 3,521 |

- **Why a small network?** We have only 21 inputs. A bigger network would memorise instead of learning.

### Lecture 4: Backpropagation, loss functions, gradient descent

- **Training loop, the same four steps as the lecture:** forward pass, calculate the error with the loss function, backward pass with the chain rule, update the weights.
- **Our loss function is binary cross-entropy**, not MSE. The lecture says MSE is for regression (predicting numbers) and cross-entropy is for classification. Our task is classification.
- **Sigmoid with cross-entropy:** the lecture shows that this pair gives a very simple error at the output: prediction minus target. That is the pair we use.
- **Learning rate:** we used 0.0001. It is small, so the steps are careful and do not overshoot. If validation loss stops improving for 3 epochs, the learning rate is cut in half.

### Lecture 5: Optimisers, epochs, batches

- **We use Adam**, which the lecture describes as Momentum plus RMSProp. Momentum smooths the direction. RMSProp gives each weight its own step size.
- **We use mini-batches of 512 records.** This is Mini-Batch Gradient Descent: not the whole dataset at once, and not one record at a time.
- **Epoch and iteration with our numbers** (the same exercise as the lecture):
  - Training samples: 141,834. Batch size: 512.
  - Iterations per epoch: 141,834 / 512 = 278 (rounded up).
  - Training ran 19 epochs, so about 278 x 19 = 5,282 weight updates.

### Lecture 6: Overfitting, initialisation, regularisation

- **Overfitting** means the model memorises the training data and fails on new data. **Generalisation** means it works on data it has never seen.
- **What we used against overfitting:**

| Technique | Our setting | Simple meaning |
|---|---|---|
| L2 regularisation | lambda = 0.0001 | Punishes very large weights |
| Dropout | 10% after each hidden layer | Switches off random neurons during training only |
| Early stopping | patience 8 | Stops when validation loss stops improving |

- **Early stopping in our run:** the best validation loss was at epoch 11. After 8 more epochs with no improvement, training stopped at epoch 19, and the weights from epoch 11 were restored. The maximum allowed was 60.
- **How we know it did not overfit:** validation recall is 83.3% and test recall is 82.8%. They are almost the same.
- **L1:** not used. L1 pushes weights to zero to remove features. All our 21 features are meaningful, so L2 is the better choice, as the lecture says.
- **Batch normalisation:** not used. We standardise the inputs once, before the network, using training statistics. The idea is similar (subtract the mean, divide by the standard deviation), but it is done once on the inputs, not inside the network for every mini-batch.
- **Weight initialisation:** the final model did not start from random weights. It started from the weights of our earlier 2015 model and was fine-tuned on 2021 data. This is called **transfer learning**. When we train from scratch, Keras uses its default, Glorot (Xavier) uniform. The lecture says He initialisation suits ReLU, so that is something we could try in future.
- **Vanishing gradients:** ReLU in the hidden layers and a shallow network (only two hidden layers) keep this from being a problem.

## 5. The data

- **Source:** BRFSS 2021, a public telephone survey by the CDC in the United States. Original file: 438,693 records.
- **Cleaning:** if a person had a missing answer, or said "don't know" or "refused", we removed that record. We never guessed or filled in a value. After cleaning and removing overlap with the 2015 data: 222,600 records.
- **The label:** from the survey question "Has a doctor ever told you that you have diabetes?" Yes is 1. No, pre-diabetes, and diabetes only during pregnancy are 0. So the label is what the person **said**, not a blood test.
- **The 21 inputs, in four groups on the website:**
  - Background: age group, sex, education, income.
  - Health: high blood pressure, high cholesterol, cholesterol check, BMI, stroke, heart disease, general health (1 to 5), difficulty walking.
  - Daily life: smoking, physical activity, fruit, vegetables, heavy alcohol.
  - Wellbeing: bad mental health days, bad physical health days, health coverage, could not see a doctor because of cost.
- **Why three parts?** Training data teaches the weights. Validation data is for decisions during training (early stopping, the cutoff). Test data is used only at the end, to measure honestly.
- **A special detail:** many people give exactly the same 21 answers. We kept identical profiles together in one part, so the same input can never be in both training and test. This prevents **data leakage**.
- **Standardisation** uses the mean and standard deviation from the training part only, for the same reason.

## 6. The results in simple words

Imagine 100 people from the test set. About 16 of them have label 1.

- The model flags 43 people.
- 13 of those really have label 1. These are found correctly.
- 30 are false alarms.
- 3 people with label 1 are missed.

The real counts (confusion matrix, 40,376 test records):

| | Predicted 0 | Predicted 1 |
|---|---|---|
| Actual 0 | 21,881 (true negative) | 12,231 (false positive) |
| Actual 1 | 1,076 (false negative) | 5,188 (true positive) |

What each measure means:

- **Recall 82.8%:** of the people with label 1, we found about 83 out of 100. Formula: TP / (TP + FN).
- **Precision 29.8%:** when the model says "1", it is right about 30 times out of 100. Formula: TP / (TP + FP).
- **Accuracy 67.0%:** of all answers, 67 out of 100 are correct.
- **ROC AUC 0.813:** take one random person with label 1 and one with label 0. The model gives the higher score to the right one about 81 times out of 100.

## 7. Two questions the teacher will probably ask

### "Why is your accuracy only 67%?"

Because accuracy is the wrong main measure for imbalanced data. About 85% of people have label 0. A model that always says "0" gets 84.5% accuracy, but it finds nobody, so it is useless. We chose to find most of the positive cases (high recall), and the price is more false alarms and lower accuracy. We tested this: with a higher cutoff our same network reached 85% accuracy, but recall dropped to 14%. We rejected that version.

### "Why is the cutoff 0.132 and not 0.5?"

Only about 15% of the records are positive, so the scores are mostly low. With 0.5 the model would call almost everyone 0. We chose the cutoff on the **validation** data with this rule: keep recall at 83% or more, and from the cutoffs that do this, take the one with the best accuracy. The test data was not used for this choice.

## 8. Is the neural network better than a simple model?

Be honest here. It is a strong answer, not a weak one.

- Logistic regression is like **one single neuron with a sigmoid**. It can only draw a straight-line boundary, like the perceptron in Lecture 2.
- Its ROC AUC is 0.805. Our network's is 0.813. The network is only a little better.
- Why? Most of our inputs are simple yes or no answers, and the pattern is close to a straight line. So the extra layers cannot add much.
- What we learned: a neural network is not automatically better on simple table data. Data splitting, scaling and the cutoff mattered more than the architecture.

## 9. The system

| Part | Technology | Its job |
|---|---|---|
| Frontend | React, TypeScript | The pages, the form, the charts and animations |
| Backend | Python, FastAPI | Checks the input, runs the model, returns the result |
| Model | TensorFlow / Keras | The trained network, saved as a file |
| Database | PostgreSQL | Saves every prediction |

The parts of the model that are saved together: the weights, the training means and standard deviations, and the cutoff. The server loads them once when it starts.

## 10. Showing the website

A simple order for the demonstration:

1. **Home page.** Show the animated network diagram: 21, 64, 32, 1. Scroll to the four numbers and the three rings (accuracy, recall, precision).
2. **Try the prediction.** Choose the example "Early seventies, several conditions". Review the answers and press Run prediction.
3. **The result.** The gauge moves to about 60.6%, far above the 13.2% cutoff, so label 1.
4. **What moved the score.** For this example, BMI, general health and high blood pressure raised the score the most. To get each bar, we replace one answer with the average answer and see how much the score changes.
5. **What if.** Change BMI from 36 to 24. The score falls to about 43%. This shows the network reacting live.
6. **The model page.** Show the comparison table with logistic regression. Move the cutoff slider: when the cutoff goes up, accuracy goes up and recall goes down. This is the trade-off from section 7.
7. Finish with the limits (section 11).

## 11. Limits: say them before the teacher asks

- It is **not a diagnosis**. The label is a survey answer, not a medical test.
- The score is **not a personal risk** of disease.
- About 70% of the positive predictions are false alarms.
- The data is from the USA in 2021, and we dropped records with missing answers, so it does not represent every population.
- We did not test fairness between groups (age, sex, income).

## 12. Quick questions and answers

| Question | Short answer |
|---|---|
| What type of network is it? | A feed-forward multi-layer perceptron, fully connected. |
| How many layers? | Input, two hidden layers, output. |
| What type of learning? | Supervised learning, because every record has a label. |
| What is the task? | Binary classification: label 0 or label 1. |
| Which activation functions? | ReLU in the hidden layers, sigmoid at the output. |
| Which loss function? | Binary cross-entropy, plus the L2 penalty. |
| Which optimiser? | Adam, learning rate 0.0001. |
| Which type of gradient descent? | Mini-batch, batch size 512. |
| How many epochs? | 19 completed. The best was epoch 11. The maximum was 60. |
| How did you prevent overfitting? | L2, dropout 10%, early stopping. |
| Is dropout used when predicting? | No. Only during training. |
| Why standardise the inputs? | BMI goes from 12 to 98 and others are 0 or 1. Without scaling, big numbers dominate the learning. |
| What is the validation set for? | Early stopping and choosing the cutoff. |
| What is the test set for? | The final, honest measurement. |
| Which library? | TensorFlow and Keras, in Python. |
| What is a false positive here? | A person with label 0 that the model flags as 1. |
| What is a false negative here? | A person with label 1 that the model misses. |
| Which error is worse? | In screening, a missed case is usually worse. That is why we protected recall. |
| Does the model learn when users use the site? | No. It was trained once. The site only runs it. |
| Can it be used in a hospital? | No. It is educational only. |

## 13. Things not to say

- Do not say "it diagnoses diabetes" or "it predicts if you will get diabetes". Say "it classifies a survey label".
- Do not say "the accuracy is 85%". That number belongs to the useless "always 0" rule and to the version we rejected.
- Do not say we used batch normalisation, L1, softmax or MSE. We did not.
- Do not say the network is much better than logistic regression. It is slightly better.

## 14. Where the website is now ahead of the report

The report was written on 10 November. The website has changed since then. If the teacher compares them:

| Topic | Report says | Website now |
|---|---|---|
| Result page | Score and label | Also "what moved the score" and the "what if" explorer |
| Model page | Metrics and confusion matrix | Also the comparison with logistic regression, ROC and precision-recall curves, and the cutoff slider |
| Database | A "users" table reserved for the future | Removed, because nothing used it |
| Rate limiting | "No rate limiting" | Added: 30 saved predictions per minute for each visitor |
| Tests | 127 backend, 27 frontend | 155 backend, 37 frontend |
| F score | F1 = 0.438 | The site shows F2 = 0.611, which gives more weight to recall |

## 15. Mini glossary

| Word | Simple meaning |
|---|---|
| Weight | A number on a connection that says how important an input is |
| Bias | An extra number added in each neuron that shifts the result |
| Activation function | The function applied after the weighted sum. It makes the network non-linear |
| Forward propagation | Data going from input to output to make a prediction |
| Backpropagation | Sending the error backwards with the chain rule to find how to change each weight |
| Loss | One number that says how wrong the network is |
| Gradient | The slope of the loss. It shows which direction makes the error bigger |
| Learning rate | How big each update step is |
| Epoch | One full pass over the training data |
| Iteration | One update of the weights, using one batch |
| Overfitting | Memorising the training data and failing on new data |
| Threshold / cutoff | The score above which we say label 1 |
| Class imbalance | One class is much rarer than the other |
| Inference | Using the trained model without changing it |
