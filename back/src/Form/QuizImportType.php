<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class QuizImportType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $jsonExample = [
            'title' => 'Titre du quiz',
            'level' => 'Niveau du quiz',
            'categories' => ['Catégorie 1', 'Catégorie 2'],
            'questions' => [
                [
                    'text' => 'Texte de la question',
                    'options' => [
                        ['text' => 'Première option', 'id' => 'A'],
                        ['text' => 'Deuxième option', 'id' => 'B'],
                        ['text' => 'Troisième option', 'id' => 'C'],
                        ['text' => 'Quatrième option', 'id' => 'D']
                    ],
                    'correctAnswer' => 'B',
                    'explanation' => 'Explication de la réponse'
                ]
            ],
            'timePerQuestion' => 30,
            'passingScore' => 70
        ];

        $builder
            ->add('json', TextareaType::class, [
                'label' => 'JSON du quiz',
                'help' => sprintf('Format attendu : <pre class="mt-2">%s</pre>', json_encode($jsonExample, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)),
                'help_html' => true,
                'attr' => [
                    'rows' => 20,
                    'class' => 'font-monospace'
                ],
                'required' => true
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => null,
        ]);
    }
} 