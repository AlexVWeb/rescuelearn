<?php

namespace App\Form;

use App\Entity\SNVVictim;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class SNVVictimType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('description', TextareaType::class, [
                'label' => 'Description',
                'attr' => ['rows' => 3]
            ])
            ->add('correctAnswer', ChoiceType::class, [
                'label' => 'Réponse correcte',
                'choices' => [
                    'Vert' => 0,
                    'Jaune' => 1,
                    'Rouge' => 2,
                    'Noir' => 3
                ],
                'expanded' => true,
                'multiple' => false
            ])
            ->add('explanation', TextareaType::class, [
                'label' => 'Explication',
                'attr' => ['rows' => 3]
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => SNVVictim::class,
        ]);
    }
} 