# 📝 RÈGLES SCSS À RESPECTER

## ⚠️ RÈGLE ABSOLUE : ORDRE DES DÉCLARATIONS

Pour éviter les warnings de dépréciation Sass, **TOUJOURS** respecter cet ordre dans un sélecteur :

### ✅ ORDRE CORRECT
```scss
.mon-element {
  // 1. PROPRIÉTÉS CSS EN PREMIER
  display: flex;
  width: 100%;
  color: red;
  
  // 2. MIXINS SANS RÈGLES IMBRIQUÉES
  @include font-responsive(var(--font-size-base));
  @include spacing-responsive(padding, 1rem);
  
  // 3. PUIS RÈGLES IMBRIQUÉES (&, ::pseudo, enfants)
  &:hover {
    color: blue;
  }
  
  &::before {
    content: '';
  }
  
  .enfant {
    margin: 0;
  }
  
  @include respond-to('mobile') {
    width: 50%;
  }
}
```

### ❌ ORDRE INCORRECT (génère des warnings)
```scss
.mon-element {
  display: flex;
  
  &:hover {  // ❌ Règle imbriquée
    color: blue;
  }
  
  width: 100%;  // ❌ Propriété après règle imbriquée = WARNING
  color: red;   // ❌ Propriété après règle imbriquée = WARNING
}
```

## 🛠️ SOLUTIONS POUR CORRIGER

### Option 1 : Réorganiser l'ordre (recommandée)
```scss
.mon-element {
  // Propriétés d'abord
  display: flex;
  width: 100%;
  color: red;
  
  // Règles imbriquées après
  &:hover {
    color: blue;
  }
}
```

### Option 2 : Envelopper dans `& {}`
```scss
.mon-element {
  &:hover {
    color: blue;
  }
  
  & {
    display: flex;  // ✅ Forcé dans nouveau comportement
    width: 100%;
    color: red;
  }
}
```

## 🎯 RÈGLES SPÉCIFIQUES

1. **Propriétés CSS** → en premier
2. **Mixins sans imbrication** → après les propriétés
3. **Pseudo-éléments** (::before, ::after) → après
4. **Pseudo-classes** (&:hover, &:focus) → après
5. **Sélecteurs enfants** (.enfant) → après
6. **Media queries** (@include respond-to) → en dernier

## 🚫 ERREURS FRÉQUENTES À ÉVITER

- ❌ Mélanger propriétés et règles imbriquées
- ❌ Mettre des propriétés après des `&:hover`
- ❌ Propriétés après `@include respond-to`
- ❌ Propriétés après sélecteurs enfants

## 💡 ASTUCE MNÉMOTECHNIQUE

**"PROPRIÉTÉS → MIXINS → IMBRICATIONS"**

Cette règle simple évite 99% des warnings SCSS !