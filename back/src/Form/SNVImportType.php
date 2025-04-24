<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\Json;

class SNVImportType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('json', TextareaType::class, [
                'label' => 'JSON du scénario SNV',
                'attr' => [
                    'rows' => 15,
                    'placeholder' => 'Collez ici le JSON du scénario SNV...'
                ],
                'constraints' => [
                    new Json([
                        'message' => 'Le contenu doit être un JSON valide'
                    ])
                ]
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => null,
        ]);
    }
} 