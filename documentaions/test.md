# Optimisation des poids d'un modèle de régression linéaire

## Question
Quel processus est utilisé pour optimiser les poids d'un modèle de régression linéaire ?

### Réponses possibles
- **A. Descente de gradient** ✅
- **B. Moindres carrés ordinaires** ❌
- **C. Homoscédasticité** ❌
- **D. Régularisation** ❌

## Réponse correcte : A. Descente de gradient
La **descente de gradient** est un algorithme itératif utilisé pour optimiser les poids \( w \) et \( b \) en minimisant la fonction de coût \( J(w, b) \).

### Étapes du processus
1. **Initialisation** : Choisir des valeurs initiales pour \( w \) et \( b \) (souvent 0 ou aléatoires).
2. **Calcul du gradient de la fonction de coût** :
   \[
   \frac{\partial J}{\partial w} = \frac{1}{m} \sum_{i=1}^{m} \left( (w x^{(i)} + b - y^{(i)}) \cdot x^{(i)} \right)
   \]
   \[
   \frac{\partial J}{\partial b} = \frac{1}{m} \sum_{i=1}^{m} \left( w x^{(i)} + b - y^{(i)} \right)
   \]
3. **Mise à jour des poids** :
   \[
   w := w - \alpha \cdot \frac{\partial J}{\partial w}, \quad b := b - \alpha \cdot \frac{\partial J}{\partial b}
   \]
   où \( \alpha \) est le **taux d'apprentissage**.
4. **Itérations jusqu'à convergence** : Répéter jusqu'à ce que \( J(w, b) \) devienne suffisamment petit.

## Explications des mauvaises réponses
### B. Moindres carrés ordinaires ❌
La méthode des **moindres carrés ordinaires (OLS)** est une solution analytique directe pour calculer \( w \) et \( b \), mais ce n’est pas un algorithme d’optimisation itératif.  
**Formules** :
\[
w = \frac{n \sum x_i y_i - \sum x_i \sum y_i}{n \sum x_i^2 - (\sum x_i)^2}
\]
\[
b = \frac{\sum y_i - w \sum x_i}{n}
\]

### C. Homoscédasticité ❌
L’**homoscédasticité** est une hypothèse statistique, pas un processus d’optimisation. Elle suppose que la variance des erreurs est constante et indépendante des variables explicatives \( x \). Elle est utilisée pour valider les tests statistiques, mais n’optimise pas les poids.

### D. Régularisation ❌
La **régularisation** est une technique pour contrôler la complexité du modèle, pas un algorithme d’optimisation. Elle ajoute un terme de pénalisation à la fonction de coût pour éviter le surapprentissage.

#### Fonctions de coût avec régularisation
- **Ridge (L2)** :
  \[
  J(w, b) = MSE + \lambda \sum w_i^2
  \]
- **Lasso (L1)** :
  \[
  J(w, b) = MSE + \lambda \sum |w_i|
  \]
  où \( \lambda \) est le coefficient de régularisation.

#### Effet du choix de \( \lambda \)
| Valeur de \( \lambda \) | Effet sur le modèle                  | Conséquence                     |
|-------------------------|--------------------------------------|----------------------------------|
| \( \lambda = 0 \)       | Aucune pénalisation                  | Risque de surapprentissage      |
| \( \lambda \) faible     | Légère contrainte                    | Bonne généralisation possible   |
| \( \lambda \) élevé      | Forte contrainte (petits poids)      | Risque de sous-apprentissage    |
